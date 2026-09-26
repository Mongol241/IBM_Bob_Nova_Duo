import type { ConflictRegion, BobResolution } from "./types.js";
export declare function callBobShell(conflict: ConflictRegion): Promise<BobResolution>;
export declare function callBobShellWithConcurrency(conflicts: ConflictRegion[], maxConcurrent: number): Promise<Array<{
    conflict: ConflictRegion;
    result: BobResolution | null;
    error: string | null;
}>>;
export declare function callBobShellBatched(conflicts: ConflictRegion[], filePath: string): Promise<Array<{
    conflict: ConflictRegion;
    result: BobResolution | null;
    error: string | null;
}>>;
export declare function callBobShellBatchedByFile(conflicts: ConflictRegion[], maxConcurrent: number): Promise<Array<{
    conflict: ConflictRegion;
    result: BobResolution | null;
    error: string | null;
}>>;
//# sourceMappingURL=resolver.d.ts.map