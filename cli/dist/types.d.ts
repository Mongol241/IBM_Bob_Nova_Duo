/**
 * Ticket JSON schema — the data contract between CLI and dashboard.
 * This shape must remain stable once the dashboard starts consuming it.
 */
export interface ConflictRegion {
    /** Relative path from repo root */
    file: string;
    /** 1-based line number where <<<<<<< appears */
    startLine: number;
    /** 1-based line number where >>>>>>> appears */
    endLine: number;
    /** Text between <<<<<<< HEAD and ======= (trimmed) */
    head: string;
    /** Text between ======= and >>>>>>> branch (trimmed) */
    incoming: string;
    /**
     * Full content of the file this conflict lives in, with the conflict markers
     * replaced by a neutral placeholder so Bob sees the surrounding code clearly.
     */
    fileContext?: string;
    /**
     * Compact architectural digest of the whole repository: one entry per source
     * file listing its exports and key declarations. Lets Bob resolve conflicts
     * with knowledge of the overall codebase design rather than only the two
     * conflicting lines.
     */
    repoContext?: string;
}
export type TicketStatus = "auto-resolved" | "needs-review";
export interface Ticket {
    id: string;
    file: string;
    startLine: number;
    endLine: number;
    head: string;
    incoming: string;
    confidence: number;
    resolution: string;
    reasoning: string;
    status: TicketStatus;
}
/** Raw JSON Bob Shell is expected to return for a single conflict */
export interface BobResolution {
    resolution: string;
    confidence: number;
    reasoning: string;
}
//# sourceMappingURL=types.d.ts.map