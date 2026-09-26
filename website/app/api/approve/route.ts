import { NextResponse } from 'next/server';
import { readTickets, writeTickets } from '@/lib/storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { pushResolvedFile } from '@/lib/github';

const execPromise = promisify(exec);

// process.cwd() is the website/ directory when running via Next.js
const ROOT = path.resolve(process.cwd(), '..');
const DEFAULT_CLI_PATH = path.join(ROOT, 'cli', 'dist', 'index.js');
const DEFAULT_REPO_PATH = path.join(ROOT, 'cli', 'demo-repo');

/**
 * POST /api/approve
 *
 * Marks a ticket as approved and writes the resolution back to the source.
 *
 * Two modes:
 * - **GitHub mode** (ticket has `githubOwner` etc.): pushes the resolved file
 *   as a commit to the PR branch via the GitHub API.
 * - **Local mode** (no GitHub context): runs `conflict-cli apply` against the
 *   local repo directory, same as before.
 */
export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();
    const tickets = await readTickets();
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.githubOwner && ticket.githubRepo && ticket.githubBranch) {
      // ── GitHub mode ───────────────────────────────────────────────────────
      if (!ticket.resolution || ticket.resolution.trim() === '') {
        return NextResponse.json(
          { error: `Ticket "${ticketId}" has an empty resolution — cannot apply.` },
          { status: 400 }
        );
      }

      await pushResolvedFile({
        owner: ticket.githubOwner,
        repo: ticket.githubRepo,
        branch: ticket.githubBranch,
        filePath: ticket.file,
        resolvedContent: ticket.resolution,
        blobSha: ticket.githubBlobSha ?? '',
      });
    } else {
      // ── Local mode (original behaviour) ───────────────────────────────────
      // Write the current ticket state to a temp file for the CLI to consume
      const tmpFile = path.join(process.cwd(), 'data', 'current_tickets.json');
      await fs.writeFile(tmpFile, JSON.stringify(tickets, null, 2));

      const cliPath = process.env.CLI_PATH
        ? path.resolve(process.cwd(), process.env.CLI_PATH)
        : DEFAULT_CLI_PATH;
      const repoPath = process.env.REPO_PATH
        ? path.resolve(process.cwd(), process.env.REPO_PATH)
        : DEFAULT_REPO_PATH;
      await execPromise(
        `node "${cliPath}" apply --file "${tmpFile}" --id "${ticketId}" --repo "${repoPath}"`
      );
    }

    // Mark approved in storage regardless of mode
    const updatedTickets = tickets.map(t =>
      t.id === ticketId ? { ...t, approved: true } : t
    );
    await writeTickets(updatedTickets);

    return NextResponse.json({ success: true, ticket: updatedTickets.find(t => t.id === ticketId) });
  } catch (error: any) {
    console.error('Approve Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
