export type TicketStatus = "auto-resolved" | "needs-review";

export interface Ticket {
  id: string;
  file: string;
  startLine?: number;
  endLine?: number;
  confidence: number;
  resolution: string;
  reasoning: string;
  status: TicketStatus;
  /** Set to true after the user approves and the CLI apply command runs */
  approved: boolean;
  /** Set to true after the user explicitly rejects this resolution */
  rejected?: boolean;
  /** HEAD (current branch) side of the conflict */
  head: string;
  /** Incoming (merging branch) side of the conflict */
  incoming: string;

  // ── GitHub PR context (present only in GitHub mode) ──────────────────────
  /** GitHub repo owner (org or user) */
  githubOwner?: string;
  /** GitHub repo name */
  githubRepo?: string;
  /** Pull request number */
  githubPrNumber?: number;
  /** Head branch name — the branch the PR is merging from */
  githubBranch?: string;
  /** Blob SHA of the file at the time the ticket was created.
   *  Required by the GitHub API to update (replace) file contents. */
  githubBlobSha?: string;
}
