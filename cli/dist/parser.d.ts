import type { ConflictRegion } from "./types.js";
export declare function findConflictedFiles(repoPath: string): Promise<string[]>;
export declare function parseConflicts(fileContent: string, relativeFilePath: string): ConflictRegion[];
export declare function collectAllConflicts(repoPath: string): Promise<ConflictRegion[]>;
/**
 * Parse conflicts from an in-memory map of file contents.
 * Used by the GitHub integration path where files are fetched via API
 * rather than read from disk.
 *
 * @param files - Map from repo-relative forward-slash path → raw file content
 */
export declare function collectConflictsFromStrings(files: Map<string, string>): ConflictRegion[];
//# sourceMappingURL=parser.d.ts.map