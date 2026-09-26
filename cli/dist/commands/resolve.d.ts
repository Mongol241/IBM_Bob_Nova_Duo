import type { Ticket } from "../types.js";
export declare function runResolve(opts: {
    repo: string;
    confidenceThreshold: number;
    concurrency: number;
}): Promise<void>;
/**
 * Resolve conflicts from an in-memory file map (GitHub integration path).
 * Returns the ticket array directly instead of printing to stdout.
 *
 * @param files - Map from repo-relative forward-slash path → raw file content
 * @param opts.confidenceThreshold - Min confidence to mark a ticket "auto-resolved"
 * @param opts.concurrency - Max parallel Bob Shell spawns
 */
export declare function resolveFromStrings(files: Map<string, string>, opts: {
    confidenceThreshold: number;
    concurrency: number;
}): Promise<Ticket[]>;
//# sourceMappingURL=resolve.d.ts.map