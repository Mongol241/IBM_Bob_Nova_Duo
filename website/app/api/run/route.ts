import { NextResponse } from 'next/server';
import { writeTickets } from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fetchConflictedFiles, getPrInfo } from '@/lib/github';
import type { Ticket } from '@/lib/types';

const execPromise = promisify(exec);

// process.cwd() is the website/ directory when running via Next.js
const ROOT = path.resolve(process.cwd(), '..');
const DEFAULT_CLI_PATH = path.join(ROOT, 'cli', 'dist', 'index.js');
const DEFAULT_REPO_PATH = path.join(ROOT, 'cli', 'demo-repo');

/**
 * POST /api/run
 *
 * Supports two modes:
 *
 * 1. **Local mode** (default / legacy): scans a local repo directory via the CLI.
 *    Body: {} (empty) — reads CLI_PATH and REPO_PATH from env.
 *
 * 2. **GitHub mode**: fetches conflicted files from a GitHub PR, writes them to a
 *    temporary directory, runs the CLI against that directory, then enriches each
 *    ticket with the GitHub PR context needed for the approve step to push back.
 *    Body: { repo_owner: string, repo_name: string, pr_number: number }
 */
export async function POST(request: Request) {
  console.log('DEBUG: DEMO_MODE is', process.env.DEMO_MODE);

  // Parse body — GitHub fields are optional; missing body is fine for local mode.
  let body: { repo_owner?: string; repo_name?: string; pr_number?: number } = {};
  try {
    body = await request.json();
  } catch {
    // Empty or non-JSON body → local mode
  }

  const isGitHubMode =
    typeof body.repo_owner === 'string' &&
    typeof body.repo_name === 'string' &&
    typeof body.pr_number === 'number';

  try {
    let tickets: Ticket[];

    if (process.env.DEMO_MODE === 'true') {
      // ── Demo mode: return golden fixture ────────────────────────────────
      const goldenPath = path.join(process.cwd(), 'golden_tickets.json');
      const data = await fs.readFile(goldenPath, 'utf8');
      tickets = (JSON.parse(data) as any[]).map((t: any) => ({ approved: false, ...t }));
    } else if (isGitHubMode) {
      // ── GitHub mode ──────────────────────────────────────────────────────
      const owner = body.repo_owner!;
      const repo = body.repo_name!;
      const prNumber = body.pr_number!;

      // 1. Get PR metadata (branch name, head SHA, mergeability)
      const prInfo = await getPrInfo(owner, repo, prNumber);

      // 2. Fetch the raw content of every conflicted file from the PR
      const conflictedFiles = await fetchConflictedFiles(owner, repo, prNumber);

      if (conflictedFiles.length === 0) {
        await writeTickets([]);
        return NextResponse.json([]);
      }

      // 3. Write files to a temporary directory so the CLI can scan them
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'conflict-resolver-'));
      try {
        for (const f of conflictedFiles) {
          const filePath = path.join(tmpDir, ...f.filename.split('/'));
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, f.content, 'utf8');
        }

        // 4. Run the CLI against the temp directory
        const cliPath = process.env.CLI_PATH
          ? path.resolve(process.cwd(), process.env.CLI_PATH)
          : DEFAULT_CLI_PATH;

        const { stdout } = await execPromise(
          `node "${cliPath}" resolve --repo "${tmpDir}"`,
          { timeout: 360_000, maxBuffer: 10 * 1024 * 1024 }
        );

        // 5. Parse tickets and inject GitHub context for the approve step
        const blobShaByFile = new Map(conflictedFiles.map((f) => [f.filename, f.blobSha]));

        tickets = (JSON.parse(stdout) as any[]).map((t: any) => ({
          approved: false,
          rejected: false,
          githubOwner: owner,
          githubRepo: repo,
          githubPrNumber: prNumber,
          githubBranch: prInfo.headBranch,
          // ticket.file is the path relative to the temp dir — we need the original filename
          githubBlobSha: blobShaByFile.get(t.file) ?? '',
          ...t,
        }));
      } finally {
        // Clean up temp directory (best-effort)
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    } else {
      // ── Local mode (original behaviour) ──────────────────────────────────
      const cliPath = process.env.CLI_PATH
        ? path.resolve(process.cwd(), process.env.CLI_PATH)
        : DEFAULT_CLI_PATH;
      const repoPath = process.env.REPO_PATH
        ? path.resolve(process.cwd(), process.env.REPO_PATH)
        : DEFAULT_REPO_PATH;
      // 5 conflicts × 60 s each + startup overhead; maxBuffer covers verbose JSON output
      const { stdout } = await execPromise(
        `node "${cliPath}" resolve --repo "${repoPath}"`,
        { timeout: 360_000, maxBuffer: 10 * 1024 * 1024 }
      );
      tickets = (JSON.parse(stdout) as any[]).map((t: any) => ({
        approved: false,
        rejected: false,
        ...t,
      }));
    }

    await writeTickets(tickets);
    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Run Resolver Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
