/**
 * GitHub API client helpers.
 * All methods require GITHUB_TOKEN set in the environment.
 */
import { Octokit } from '@octokit/rest';

export interface PrFile {
  /** Repo-relative forward-slash path */
  filename: string;
  /** Raw file content fetched from the HEAD of the PR branch */
  content: string;
  /** The blob SHA on the PR branch — needed when creating a replacement commit */
  blobSha: string;
}

export interface PrInfo {
  /** SHA of the head commit on the PR branch */
  headSha: string;
  /** Branch name that the PR is from */
  headBranch: string;
  /** Whether GitHub considers the PR mergeable */
  mergeable: boolean | null;
}

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN environment variable is not set. ' +
        'Create a Personal Access Token with repo scope and add it to .env.local.'
    );
  }
  return new Octokit({ auth: token });
}

/** Fetch basic metadata about a pull request. */
export async function getPrInfo(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PrInfo> {
  const octokit = getOctokit();
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  return {
    headSha: data.head.sha,
    headBranch: data.head.ref,
    mergeable: data.mergeable,
  };
}

/**
 * Fetch the raw content of every file in a PR that contains conflict markers.
 *
 * Conflict markers (`<<<<<<<`) only exist in GitHub's test merge commit. GitHub exposes
 * this via the Git refs API at `refs/pull/<N>/merge`, but `repos.getContent` does not
 * accept full ref paths — we must first resolve the ref to a commit SHA via
 * `git.getRef`, then use that SHA with `getContent`.
 *
 * Strategy:
 *   1. Resolve `refs/pull/<N>/merge` → merge commit SHA via the Git refs API.
 *   2. For each changed file, fetch content at that SHA to find conflict markers.
 *   3. For each conflicted file, fetch its blob SHA at the PR head (needed for push-back).
 */
export async function fetchConflictedFiles(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string
): Promise<PrFile[]> {
  const octokit = getOctokit();

  // Step 1: resolve the pull merge ref to a real commit SHA
  let mergeSha: string;
  try {
    const { data } = await octokit.git.getRef({
      owner,
      repo,
      ref: `pull/${prNumber}/merge`, // getRef strips the leading "refs/"
    });
    mergeSha = data.object.sha;
  } catch {
    // GitHub hasn't computed a merge commit yet (mergeable === null) or the PR
    // has no conflicts according to GitHub — nothing to resolve.
    return [];
  }

  // Step 2: list files changed in the PR
  const { data: prFiles } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const results: PrFile[] = [];

  for (const f of prFiles) {
    if (!f.filename || f.status === 'removed') continue;

    // Fetch file content at the merge commit SHA — conflict markers live here.
    // Files >1 MB: GitHub returns content="" and provides a download_url instead.
    let content: string;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: f.filename,
        ref: mergeSha,
      });
      if (Array.isArray(data) || data.type !== 'file') continue;
      if (data.content) {
        content = Buffer.from(data.content, 'base64').toString('utf8');
      } else if (data.download_url) {
        // Large file (>1 MB) — fetch the raw content directly
        const res = await fetch(data.download_url);
        if (!res.ok) continue;
        content = await res.text();
      } else {
        continue;
      }
    } catch {
      continue;
    }

    if (!content.includes('<<<<<<<')) continue;

    // Step 3: fetch blob SHA from the PR head branch (needed when pushing the resolution)
    let blobSha: string;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: f.filename,
        ref: headSha,
      });
      if (Array.isArray(data) || data.type !== 'file') continue;
      blobSha = data.sha;
    } catch {
      continue;
    }

    results.push({ filename: f.filename, content, blobSha });
  }

  return results;
}

/**
 * Push a single file change as a new commit on the PR branch.
 * Used by the approve flow to write the resolved content back to GitHub.
 */
export async function pushResolvedFile(opts: {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  resolvedContent: string;
  blobSha: string;
  commitMessage?: string;
}): Promise<void> {
  const octokit = getOctokit();

  const message =
    opts.commitMessage ??
    `fix: auto-resolve merge conflict in ${opts.filePath} [conflict-resolver]`;

  await octokit.repos.createOrUpdateFileContents({
    owner: opts.owner,
    repo: opts.repo,
    path: opts.filePath,
    message,
    content: Buffer.from(opts.resolvedContent, 'utf8').toString('base64'),
    sha: opts.blobSha,
    branch: opts.branch,
  });
}
