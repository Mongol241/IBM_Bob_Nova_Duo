import type { ConflictRegion, BobResolution, Ticket } from "./types.js";
export declare function assembleTicket(conflict: ConflictRegion, resolution: BobResolution | null, error: string | null, index: number, confidenceThreshold: number): Ticket;
export declare function assembleTickets(results: Array<{
    conflict: ConflictRegion;
    result: BobResolution | null;
    error: string | null;
}>, confidenceThreshold: number): Ticket[];
//# sourceMappingURL=assembler.d.ts.map