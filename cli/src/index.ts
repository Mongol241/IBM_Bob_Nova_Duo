#!/usr/bin/env node
import { Command } from "commander";
import { runResolve } from "./commands/resolve.js";
import { runApply } from "./commands/apply.js";

const program = new Command();

program
  .name("conflict-cli")
  .description(
    "Finds merge conflicts in a repo, resolves them via Bob Shell, and emits structured ticket JSON."
  )
  .version("0.1.0");

program
  .command("resolve")
  .description(
    "Scan a repo for merge conflicts, call Bob Shell per conflict, and print ticket JSON to stdout."
  )
  .requiredOption("--repo <path>", "Path to the git repository to scan")
  .option(
    "--confidence <number>",
    "Confidence threshold for auto-resolved status (0–1)",
    "0.8"
  )
  .option(
    "--concurrency <number>",
    "Max number of Bob Shell processes to run in parallel",
    "3"
  )
  .action(async (opts) => {
    const threshold = parseFloat(opts.confidence);
    const concurrency = parseInt(opts.concurrency, 10);
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      console.error("--confidence must be a number between 0 and 1");
      process.exit(1);
    }
    await runResolve({
      repo: opts.repo,
      confidenceThreshold: threshold,
      concurrency,
    });
  });

program
  .command("apply")
  .description(
    "Apply a single approved resolution from a ticket JSON file to its source file."
  )
  .requiredOption("--file <path>", "Path to the tickets JSON file")
  .requiredOption("--id <id>", "The conflict id to apply (e.g. conflict-01)")
  .option("--repo <path>", "Root of the repository whose files will be patched (defaults to cwd)")
  .action(async (opts) => {
    await runApply({
      ticketsFile: opts.file,
      conflictId: opts.id,
      repoRoot: opts.repo,
    });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
