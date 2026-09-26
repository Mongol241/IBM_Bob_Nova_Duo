import { spawn } from "child_process";
import type { ConflictRegion, BobResolution } from "./types.js";

const TIMEOUT_MS = 60_000;

function buildPrompt(conflict: ConflictRegion): string {
  return (
    `Resolve the merge conflict in file "${conflict.file}" between lines ${conflict.startLine}–${conflict.endLine}.\n` +
    `\n` +
    `HEAD side:\n` +
    `${conflict.head}\n` +
    `\n` +
    `INCOMING side:\n` +
    `${conflict.incoming}\n` +
    `\n` +
    `Respond with ONLY this JSON object, no markdown fences, no extra text:\n` +
    `{"resolution": string, "confidence": number 0-1, "reasoning": string}`
  );
}

function extractJson(raw: string): BobResolution {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in output: ${raw}`);
  }
  const jsonStr = raw.slice(start, end + 1);
  return JSON.parse(jsonStr) as BobResolution;
}

export async function callBobShell(conflict: ConflictRegion): Promise<BobResolution> {
  const prompt = buildPrompt(conflict);

  return new Promise<BobResolution>((resolve, reject) => {
    const child = spawn("bob", ["-p", prompt], { shell: true });

    if (!child.stdout || !child.stderr) {
      reject(new Error("child process has no stdout/stderr — stdio must be 'pipe'"));
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`bob process timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    child.on("close", (code: number | null) => {
      clearTimeout(timer);

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8");
        reject(new Error(stderr || `bob exited with code ${String(code)}`));
        return;
      }

      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      try {
        resolve(extractJson(stdout));
      } catch (err) {
        reject(err);
      }
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function callBobShellWithConcurrency(
  conflicts: ConflictRegion[],
  maxConcurrent: number
): Promise<Array<{ conflict: ConflictRegion; result: BobResolution | null; error: string | null }>> {
  const results: Array<{ conflict: ConflictRegion; result: BobResolution | null; error: string | null }> =
    new Array(conflicts.length);

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < conflicts.length) {
      const i = nextIndex++;
      const conflict = conflicts[i];
      try {
        const result = await callBobShell(conflict);
        results[i] = { conflict, result, error: null };
      } catch (err) {
        results[i] = {
          conflict,
          result: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(maxConcurrent, conflicts.length)) }, () => worker());
  await Promise.all(workers);

  return results;
}
