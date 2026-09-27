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
 * Conflict markers (`<<<<<<<`) only exist in GitHub's test merge commit, exposed at
 * `refs/pull/<PR>/merge`. The PR branch's head commit contains clean source — no markers.
 *
 * Strategy:
 *   1. Fetch content from `refs/pull/<N>/merge` to detect conflict markers.
 *   2. For each conflicted file, also fetch the blob SHA from the PR head so we have
 *      the correct SHA to pass when pushing the resolution back to the branch.
 */
export async function fetchConflictedFiles(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string
): Promise<PrFile[]> {
  const octokit = getOctokit();

  // Get the list of files changed in this PR
  const { data: prFiles } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const mergeRef = `refs/pull/${prNumber}/merge`;
  const results: PrFile[] = [];

  for (const f of prFiles) {
    if (!f.filename || f.status === 'removed') continue;

    // Step 1: fetch from the merge ref — this is where conflict markers live
    let content: string;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: f.filename,
        ref: mergeRef,
      });
      if (Array.isArray(data) || data.type !== 'file') continue;
      content = Buffer.from(data.content, 'base64').toString('utf8');
    } catch {
      continue;
    }

    if (!content.includes('<<<<<<<')) continue;

    // Step 2: fetch the blob SHA from the PR head branch (needed for the push-back)
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
