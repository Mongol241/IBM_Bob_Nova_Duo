import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
const DRIFT = 5;
function detectLineEnding(raw) {
    return raw.includes("\r\n") ? "\r\n" : "\n";
}
export async function runApply(opts) {
    // 1. Read and parse the tickets file
    let raw;
    try {
        raw = await readFile(opts.ticketsFile, "utf-8");
    }
    catch {
        throw new Error(`Could not read tickets file: ${opts.ticketsFile}`);
    }
    const parsed = JSON.parse(raw);
    // 2. Validate it is an array
    if (!Array.isArray(parsed)) {
        throw new Error("tickets file does not contain a JSON array");
    }
    const tickets = parsed;
    // 3. Find the requested ticket
    const ticket = tickets.find((t) => t.id === opts.conflictId);
    if (!ticket) {
        throw new Error(`ticket "${opts.conflictId}" not found`);
    }
    // 4. Read the source file — resolve relative to repoRoot, not process.cwd()
    const root = opts.repoRoot ?? process.cwd();
    const sourcePath = resolve(root, ticket.file.replace(/\//g, "/"));
    let sourceRaw;
    try {
        sourceRaw = await readFile(sourcePath, "utf-8");
    }
    catch {
        throw new Error(`Could not read source file: ${sourcePath}`);
    }
    // 5. Split preserving line endings
    const eol = detectLineEnding(sourceRaw);
    const lines = sourceRaw.split("\n");
    // 6. Locate the <<<<<<< marker within ±DRIFT lines of startLine (1-based → 0-based)
    const expectedIdx = ticket.startLine - 1;
    const searchStart = Math.max(0, expectedIdx - DRIFT);
    const searchEnd = Math.min(lines.length - 1, expectedIdx + DRIFT);
    let startIdx = -1;
    for (let i = searchStart; i <= searchEnd; i++) {
        if (lines[i].trimEnd().startsWith("<<<<<<<")) {
            startIdx = i;
            break;
        }
    }
    if (startIdx === -1) {
        throw new Error(`Conflict marker "<<<<<<<" not found within ±${DRIFT} lines of line ${ticket.startLine} in ${ticket.file}. ` +
            `Drift exceeded — the file may have been modified since the ticket was generated.`);
    }
    // 7. Scan forward to find the matching >>>>>>> line
    let endIdx = -1;
    for (let i = startIdx + 1; i < lines.length; i++) {
        if (lines[i].trimEnd().startsWith(">>>>>>>")) {
            endIdx = i;
            break;
        }
    }
    if (endIdx === -1) {
        throw new Error(`Closing conflict marker ">>>>>>>" not found after line ${startIdx + 1} in ${ticket.file}.`);
    }
    // 8. Replace [startIdx..endIdx] with resolution lines
    const resolutionLines = ticket.resolution.split("\n").map((l) => l.replace(/\r$/, ""));
    lines.splice(startIdx, endIdx - startIdx + 1, ...resolutionLines);
    // 9. Write back, restoring original line endings
    const finalOutput = eol === "\r\n"
        ? lines.map((l) => l.replace(/\r$/, "")).join("\r\n")
        : lines.join("\n");
    await writeFile(sourcePath, finalOutput, "utf-8");
    // 10. Success message
    console.log(`Applied ${opts.conflictId}: ${ticket.file} (lines ${ticket.startLine}–${ticket.endLine})`);
}
//# sourceMappingURL=apply.js.map