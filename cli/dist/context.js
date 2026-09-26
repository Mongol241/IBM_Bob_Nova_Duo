import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".bob"]);
/** Source file extensions we want to summarise for architectural context. */
const SOURCE_EXTS = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".java", ".cs", ".rs",
]);
/**
 * Hard cap on the total character budget for the repo context string
 * injected into every Bob prompt.  6 KB is enough for ~80 files of
 * short summaries while staying well under typical LLM context limits.
 */
const MAX_CONTEXT_CHARS = 6_000;
// ── Per-file digest extraction ────────────────────────────────────────────────
/**
 * Extract a one-line summary of what a source file exports/declares.
 * Pure string parsing — no AST — so it works for any language.
 *
 * For TypeScript/JavaScript we collect:
 *   - export statements (function, class, const, interface, type, enum)
 *   - the first JSDoc comment line on exported symbols
 *
 * For other languages we fall back to lines that look like top-level
 * declarations (function/class/def/fn/pub fn).
 */
function summariseFile(content, relPath) {
    const lines = content.split("\n");
    const declarations = [];
    const isTS = relPath.endsWith(".ts") ||
        relPath.endsWith(".tsx") ||
        relPath.endsWith(".js") ||
        relPath.endsWith(".jsx") ||
        relPath.endsWith(".mjs") ||
        relPath.endsWith(".cjs");
    if (isTS) {
        let pendingDoc = "";
        for (const line of lines) {
            const trimmed = line.trim();
            // Capture the first line of a JSDoc block
            if (trimmed.startsWith("/**")) {
                const inner = trimmed.replace(/^\/\*\*\s*/, "").replace(/\s*\*\/$/, "").trim();
                pendingDoc = inner ? inner : "";
                continue;
            }
            if (trimmed.startsWith("*") || trimmed === "*/")
                continue;
            // Exported declaration
            if (trimmed.startsWith("export ")) {
                // Strip implementation bodies: keep only the signature line
                const sig = trimmed
                    .replace(/\{[\s\S]*$/, "") // drop everything from first {
                    .replace(/;$/, "")
                    .trim();
                if (sig.length > 2) {
                    const entry = pendingDoc ? `${sig}  // ${pendingDoc}` : sig;
                    declarations.push(entry);
                }
                pendingDoc = "";
                continue;
            }
            pendingDoc = "";
        }
    }
    else {
        // Generic fallback: grab top-level declaration-like lines
        for (const line of lines) {
            const t = line.trim();
            if (t.startsWith("def ") ||
                t.startsWith("class ") ||
                t.startsWith("function ") ||
                t.startsWith("pub fn ") ||
                t.startsWith("fn ") ||
                t.startsWith("func ")) {
                declarations.push(t.replace(/[:{(].*$/, "").trim());
            }
        }
    }
    if (declarations.length === 0)
        return "";
    return `${relPath}:\n` + declarations.map((d) => `  ${d}`).join("\n");
}
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Walk the repository and build a compact architectural digest.
 *
 * Returns a string that lists every source file with its exported
 * symbols/declarations.  The string is capped at MAX_CONTEXT_CHARS so it
 * never blows up prompt budgets.
 *
 * Files that contain `<<<<<<<` conflict markers are skipped — their content
 * is already surfaced in the per-conflict `fileContext` field.
 *
 * @param repoPath - Absolute path to the repo root
 */
export async function buildRepoContext(repoPath) {
    const summaries = [];
    async function walk(dir) {
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name))
                    await walk(join(dir, entry.name));
            }
            else if (entry.isFile()) {
                const fullPath = join(dir, entry.name);
                const relPath = relative(repoPath, fullPath).replace(/\\/g, "/");
                const ext = relPath.slice(relPath.lastIndexOf("."));
                if (!SOURCE_EXTS.has(ext))
                    continue;
                const content = await readFile(fullPath, "utf8").catch(() => "");
                if (!content || content.includes("<<<<<<<"))
                    continue; // skip conflicted files
                const summary = summariseFile(content, relPath);
                if (summary)
                    summaries.push(summary);
            }
        }
    }
    await walk(repoPath);
    const header = "=== REPOSITORY ARCHITECTURE (exported symbols per file) ===\n";
    const body = summaries.join("\n\n");
    const full = header + body;
    // Trim to budget, preserving whole lines
    if (full.length <= MAX_CONTEXT_CHARS)
        return full;
    let cut = full.slice(0, MAX_CONTEXT_CHARS);
    const lastNewline = cut.lastIndexOf("\n");
    if (lastNewline > header.length)
        cut = cut.slice(0, lastNewline);
    return cut + "\n... (truncated for length)";
}
/**
 * Build the same architectural digest from an in-memory file map.
 * Used on the GitHub integration path where files were fetched via API.
 *
 * @param files - Map from repo-relative forward-slash path → raw file content
 */
export function buildRepoContextFromStrings(files) {
    const summaries = [];
    for (const [relPath, content] of files) {
        if (!content || content.includes("<<<<<<<"))
            continue;
        const ext = relPath.slice(relPath.lastIndexOf("."));
        if (!SOURCE_EXTS.has(ext))
            continue;
        const summary = summariseFile(content, relPath);
        if (summary)
            summaries.push(summary);
    }
    const header = "=== REPOSITORY ARCHITECTURE (exported symbols per file) ===\n";
    const body = summaries.join("\n\n");
    const full = header + body;
    if (full.length <= MAX_CONTEXT_CHARS)
        return full;
    let cut = full.slice(0, MAX_CONTEXT_CHARS);
    const lastNewline = cut.lastIndexOf("\n");
    if (lastNewline > header.length)
        cut = cut.slice(0, lastNewline);
    return cut + "\n... (truncated for length)";
}
//# sourceMappingURL=context.js.map