import { NextResponse } from 'next/server';
import { readTickets } from '@/lib/storage';
import { pushResolvedFile } from '@/lib/github';

/**
 * POST /api/github-push
 *
 * Applies a single approved ticket's resolution to the GitHub PR branch
 * by creating a commit via the GitHub API.
 *
 * Body: { ticketId: string }
 *
 * The ticket must already carry the GitHub context fields injected by /api/run
 * (githubOwner, githubRepo, githubBranch, githubBlobSha).
 *
 * This route does NOT update ticket storage — that is done by /api/approve after
 * calling this route. It is intentionally separated so /api/approve can remain the
 * single source of truth for ticket state.
 */
export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();

    const tickets = await readTickets();
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      return NextResponse.json({ error: `Ticket "${ticketId}" not found` }, { status: 404 });
    }

    // Validate that GitHub context is present on this ticket
    if (
      !ticket.githubOwner ||
      !ticket.githubRepo ||
      !ticket.githubBranch ||
      ticket.githubBlobSha === undefined
    ) {
      return NextResponse.json(
        {
          error:
            `Ticket "${ticketId}" does not have GitHub context. ` +
            'Run the resolver in GitHub mode (provide repo_owner, repo_name, pr_number) first.',
        },
        { status: 400 }
      );
    }

    if (!ticket.resolution || ticket.resolution.trim() === '') {
      return NextResponse.json(
        { error: `Ticket "${ticketId}" has an empty resolution — cannot push.` },
        { status: 400 }
      );
    }

    await pushResolvedFile({
      owner: ticket.githubOwner,
      repo: ticket.githubRepo,
      branch: ticket.githubBranch,
      filePath: ticket.file,
      resolvedContent: ticket.resolution,
      blobSha: ticket.githubBlobSha,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('GitHub Push Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
