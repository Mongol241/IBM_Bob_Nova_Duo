import { collectAllConflicts } from "../parser.js";
import { callBobShellWithConcurrency } from "../resolver.js";
import { assembleTickets } from "../assembler.js";

export async function runResolve(opts: {
  repo: string;
  confidenceThreshold: number;
  concurrency: number;
}): Promise<void> {
  try {
    const conflicts = await collectAllConflicts(opts.repo);

    if (conflicts.length === 0) {
      console.log(JSON.stringify([], null, 2));
      return;
    }

    const results = await callBobShellWithConcurrency(conflicts, opts.concurrency);
    const tickets = assembleTickets(results, opts.confidenceThreshold);

    console.log(JSON.stringify(tickets, null, 2));
  } catch (err) {
    console.error("resolve failed:", err);
    process.exit(1);
  }
}
