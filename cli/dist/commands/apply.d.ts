export declare function runApply(opts: {
    ticketsFile: string;
    conflictId: string;
    /** Absolute path to the root of the repository being patched.
     *  ticket.file is always a forward-slash relative path from this root.
     *  Defaults to process.cwd() only when called directly from the cli/ directory. */
    repoRoot?: string;
}): Promise<void>;
//# sourceMappingURL=apply.d.ts.map