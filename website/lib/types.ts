export type TicketStatus = "auto-resolved" | "needs-review";

export interface Ticket {
  id: string;
  file: string;
  confidence: number;
  resolution: string;
  reasoning: string;
  status: TicketStatus;
  approved: boolean;
  /** Phase 1 mock only — the HEAD (current branch) side of the conflict */
  head: string;
  /** Phase 1 mock only — the Incoming (merging branch) side of the conflict */
  incoming: string;
}
