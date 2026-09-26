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
 * The content is fetched from the head commit of the PR branch, not the merge commit,
 * because the merge commit content is what already carries the `<<<<<<<` markers.
 *
 * Strategy: list all PR files, then for each changed file fetch its raw blob from the
 * PR's head commit. We look for conflict markers in the content to filter which files
 * actually need resolving.
 */
export async function fetchConflictedFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PrFile[]> {
  const octokit = getOctokit();

  // Get the list of files changed in this PR
  const { data: prFiles } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  // Fetch the raw content of each file from the PR head ref
  const results: PrFile[] = [];

  for (const f of prFiles) {
    if (!f.filename || f.status === 'removed') continue;

    let content: string;
    let blobSha: string;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: f.filename,
        ref: f.sha ?? undefined, // f.sha is the blob SHA for this file in the PR
      });

      // getContent returns an object with a content field (base64) for files
      if (Array.isArray(data) || data.type !== 'file') continue;

      blobSha = data.sha;
      content = Buffer.from(data.content, 'base64').toString('utf8');
    } catch {
      // If we can't fetch this file, skip it
      continue;
    }

    if (content.includes('<<<<<<<')) {
      results.push({ filename: f.filename, content, blobSha });
    }
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
