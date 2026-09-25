import type { ConflictRegion } from "./types.js";
export declare function findConflictedFiles(repoPath: string): Promise<string[]>;
export declare function parseConflicts(fileContent: string, relativeFilePath: string): ConflictRegion[];
export declare function collectAllConflicts(repoPath: string): Promise<ConflictRegion[]>;
//# sourceMappingURL=parser.d.ts.map