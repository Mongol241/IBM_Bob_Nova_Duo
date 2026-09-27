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
        const child = spawn("bob", ["--auth-method", "api-key", "--accept-license", "-p", prompt]);
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
// ── Batch timeout: 60s base + 30s per additional conflict, capped at 300s ──
const BATCH_TIMEOUT_MAX_MS = 300_000;
function buildBatchPrompt(conflicts, filePath) {
    const sections = [];
    const first = conflicts[0];
    // ── 1. Repository architecture context (from first conflict) ────────────
    if (first.repoContext) {
        sections.push(first.repoContext);
    }
    // ── 2. Full file context (from first conflict) ───────────────────────────
    if (first.fileContext) {
        sections.push(`=== FULL FILE: ${filePath} ===\n` +
            `(conflict markers replaced with placeholders so you can see the surrounding code)\n\n` +
            first.fileContext);
    }
    // ── 3. Each conflict, numbered ───────────────────────────────────────────
    const n = conflicts.length;
    for (let i = 0; i < n; i++) {
        const c = conflicts[i];
        sections.push(`=== CONFLICT ${i + 1} of ${n} ===\n` +
            `File: ${c.file}  (lines ${c.startLine}–${c.endLine})\n` +
            `\n` +
            `HEAD side:\n` +
            `${c.head}\n` +
            `\n` +
            `INCOMING side:\n` +
            `${c.incoming}`);
    }
    // ── 4. Instruction ───────────────────────────────────────────────────────
    sections.push(`Using the repository architecture and full file context above, resolve every conflict.\n` +
        `\n` +
        `Respond with ONLY a JSON array with exactly ${n} element(s), one per conflict in order.\n` +
        `Each element must have exactly these keys: "resolution" (string), "confidence" (number 0-1), "reasoning" (string).\n` +
        `No markdown fences, no extra text, no wrapping object — just the raw JSON array.`);
    return sections.join("\n\n");
}
function extractJsonArray(raw) {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`No JSON array found in output: ${raw}`);
    }
    return JSON.parse(raw.slice(start, end + 1));
}
export async function callBobShellBatched(conflicts, filePath) {
    if (conflicts.length === 0)
        return [];
    const prompt = buildBatchPrompt(conflicts, filePath);
    const timeoutMs = Math.min(TIMEOUT_MS + (conflicts.length - 1) * 30_000, BATCH_TIMEOUT_MAX_MS);
    const fallback = (error) => conflicts.map((conflict) => ({ conflict, result: null, error }));
    return new Promise((resolve) => {
        const child = spawn("bob", ["--auth-method", "api-key", "--accept-license", "-p", prompt]);
        if (!child.stdout || !child.stderr) {
            resolve(fallback("child process has no stdout/stderr — stdio must be 'pipe'"));
            return;
        }
        const stdoutChunks = [];
        const stderrChunks = [];
        child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
        child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
        const timer = setTimeout(() => {
            child.kill();
            resolve(fallback(`bob process timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        child.on("close", (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                const stderr = Buffer.concat(stderrChunks).toString("utf8");
                resolve(fallback(stderr || `bob exited with code ${String(code)}`));
                return;
            }
            const stdout = Buffer.concat(stdoutChunks).toString("utf8");
            let parsed;
            try {
                parsed = extractJsonArray(stdout);
            }
            catch (err) {
                resolve(fallback(err instanceof Error ? err.message : String(err)));
                return;
            }
            if (parsed.length !== conflicts.length) {
                resolve(fallback("batch response length mismatch"));
                return;
            }
            resolve(conflicts.map((conflict, i) => ({ conflict, result: parsed[i], error: null })));
        });
        child.on("error", (err) => {
            clearTimeout(timer);
            resolve(fallback(err.message));
        });
    });
}
export async function callBobShellBatchedByFile(conflicts, maxConcurrent) {
    if (conflicts.length === 0)
        return [];
    // Group conflicts by file, preserving original indices
    const fileGroups = new Map();
    for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const key = conflict.file;
        if (!fileGroups.has(key))
            fileGroups.set(key, []);
        fileGroups.get(key).push({ index: i, conflict });
    }
    const fileKeys = Array.from(fileGroups.keys());
    const results = new Array(conflicts.length);
    let nextGroupIndex = 0;
    async function worker() {
        while (nextGroupIndex < fileKeys.length) {
            const gi = nextGroupIndex++;
            const key = fileKeys[gi];
            const group = fileGroups.get(key);
            const groupConflicts = group.map((e) => e.conflict);
            const batchResults = await callBobShellBatched(groupConflicts, key);
            for (let j = 0; j < group.length; j++) {
                results[group[j].index] = batchResults[j];
            }
        }
    }
    const poolSize = Math.max(1, Math.min(maxConcurrent, fileKeys.length));
    await Promise.all(Array.from({ length: poolSize }, () => worker()));
    return results;
}
//# sourceMappingURL=resolver.js.map