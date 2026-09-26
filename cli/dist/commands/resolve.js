import { collectAllConflicts, collectConflictsFromStrings } from "../parser.js";
import { callBobShellWithConcurrency } from "../resolver.js";
import { assembleTickets } from "../assembler.js";
export async function runResolve(opts) {
    try {
        const conflicts = await collectAllConflicts(opts.repo);
        if (conflicts.length === 0) {
            console.log(JSON.stringify([], null, 2));
            return;
        }
        const results = await callBobShellWithConcurrency(conflicts, opts.concurrency);
        const tickets = assembleTickets(results, opts.confidenceThreshold);
        console.log(JSON.stringify(tickets, null, 2));
    }
    catch (err) {
        console.error("resolve failed:", err);
        process.exit(1);
    }
}
/**
 * Resolve conflicts from an in-memory file map (GitHub integration path).
 * Returns the ticket array directly instead of printing to stdout.
 *
 * @param files - Map from repo-relative forward-slash path → raw file content
 * @param opts.confidenceThreshold - Min confidence to mark a ticket "auto-resolved"
 * @param opts.concurrency - Max parallel Bob Shell spawns
 */
export async function resolveFromStrings(files, opts) {
    const conflicts = collectConflictsFromStrings(files);
    if (conflicts.length === 0)
        return [];
    const results = await callBobShellWithConcurrency(conflicts, opts.concurrency);
    return assembleTickets(results, opts.confidenceThreshold);
}
//# sourceMappingURL=resolve.js.map