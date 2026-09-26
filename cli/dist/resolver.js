import { spawn } from "child_process";
const TIMEOUT_MS = 60_000;
/**
 * Build the Bob Shell prompt for a single conflict.
 *
 * When `conflict.repoContext` is present the prompt starts with the
 * full architectural digest of the repository so Bob can reason about
 * the design intent of every file — not just the two conflicting lines.
 *
 * When `conflict.fileContext` is present Bob also sees the complete file
 * (with conflict markers neutralised) so it understands the function,
 * class, and module context surrounding the conflict.
 */
function buildPrompt(conflict) {
    const sections = [];
    // ── 1. Repository architecture context ──────────────────────────────────
    if (conflict.repoContext) {
        sections.push(conflict.repoContext);
    }
    // ── 2. Full file context ─────────────────────────────────────────────────
    if (conflict.fileContext) {
        sections.push(`=== FULL FILE: ${conflict.file} ===\n` +
            `(conflict markers replaced with placeholders so you can see the surrounding code)\n\n` +
            conflict.fileContext);
    }
    // ── 3. The conflict itself ───────────────────────────────────────────────
    sections.push(`=== MERGE CONFLICT TO RESOLVE ===\n` +
        `File: ${conflict.file}  (lines ${conflict.startLine}–${conflict.endLine})\n` +
        `\n` +
        `HEAD side:\n` +
        `${conflict.head}\n` +
        `\n` +
        `INCOMING side:\n` +
        `${conflict.incoming}`);
    // ── 4. Instruction ───────────────────────────────────────────────────────
    sections.push(`Using the repository architecture and full file context above, choose the correct ` +
        `resolution. Consider naming conventions, security implications, and design patterns ` +
        `already established in the codebase.\n` +
        `\n` +
        `Respond with ONLY this JSON object, no markdown fences, no extra text:\n` +
        `{"resolution": string, "confidence": number 0-1, "reasoning": string}`);
    return sections.join("\n\n");
}
function extractJson(raw) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`No JSON object found in output: ${raw}`);
    }
    const jsonStr = raw.slice(start, end + 1);
    return JSON.parse(jsonStr);
}
export async function callBobShell(conflict) {
    const prompt = buildPrompt(conflict);
    return new Promise((resolve, reject) => {
        const child = spawn("bob", ["-p", prompt], { shell: true });
        if (!child.stdout || !child.stderr) {
            reject(new Error("child process has no stdout/stderr — stdio must be 'pipe'"));
            return;
        }
        const stdoutChunks = [];
        const stderrChunks = [];
        child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
        child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error(`bob process timed out after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);
        child.on("close", (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                const stderr = Buffer.concat(stderrChunks).toString("utf8");
                reject(new Error(stderr || `bob exited with code ${String(code)}`));
                return;
            }
            const stdout = Buffer.concat(stdoutChunks).toString("utf8");
            try {
                resolve(extractJson(stdout));
            }
            catch (err) {
                reject(err);
            }
        });
        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
export async function callBobShellWithConcurrency(conflicts, maxConcurrent) {
    const results = new Array(conflicts.length);
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < conflicts.length) {
            const i = nextIndex++;
            const conflict = conflicts[i];
            try {
                const result = await callBobShell(conflict);
                results[i] = { conflict, result, error: null };
            }
            catch (err) {
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
//# sourceMappingURL=resolver.js.map