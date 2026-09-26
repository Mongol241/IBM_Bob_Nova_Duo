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
export declare function buildRepoContext(repoPath: string): Promise<string>;
/**
 * Build the same architectural digest from an in-memory file map.
 * Used on the GitHub integration path where files were fetched via API.
 *
 * @param files - Map from repo-relative forward-slash path → raw file content
 */
export declare function buildRepoContextFromStrings(files: Map<string, string>): string;
//# sourceMappingURL=context.d.ts.map