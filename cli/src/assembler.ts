import type { ConflictRegion, BobResolution, Ticket, TicketStatus } from "./types.js";

export function assembleTicket(
  conflict: ConflictRegion,
  resolution: BobResolution | null,
  error: string | null,
  index: number,
  confidenceThreshold: number,
): Ticket {
  const id = "conflict-" + String(index + 1).padStart(2, "0");

  if (resolution === null) {
    return {
      id,
      file: conflict.file,
      startLine: conflict.startLine,
      endLine: conflict.endLine,
      head: conflict.head,
      incoming: conflict.incoming,
      confidence: 0,
      resolution: "",
      reasoning: error ?? "unknown error",
      status: "needs-review",
    };
  }

  const confidence = Math.min(1, Math.max(0, resolution.confidence));
  const status: TicketStatus = confidence >= confidenceThreshold ? "auto-resolved" : "needs-review";

  return {
    id,
    file: conflict.file,
    startLine: conflict.startLine,
    endLine: conflict.endLine,
    head: conflict.head,
    incoming: conflict.incoming,
    confidence,
    resolution: resolution.resolution,
    reasoning: resolution.reasoning,
    status,
  };
}

export function assembleTickets(
  results: Array<{ conflict: ConflictRegion; result: BobResolution | null; error: string | null }>,
  confidenceThreshold: number,
): Ticket[] {
  return results.map((r, index) =>
    assembleTicket(r.conflict, r.result, r.error, index, confidenceThreshold),
  );
}
