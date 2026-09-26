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
}
