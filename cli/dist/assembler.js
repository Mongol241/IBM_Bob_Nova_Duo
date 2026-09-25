export function assembleTicket(conflict, resolution, error, index, confidenceThreshold) {
    const id = "conflict-" + String(index + 1).padStart(2, "0");
    if (resolution === null) {
        return {
            id,
            file: conflict.file,
            startLine: conflict.startLine,
            endLine: conflict.endLine,
            head: conflict.head,
            incoming: conflict.incoming,
            confidence: 0,
            resolution: "",
            reasoning: error ?? "unknown error",
            status: "needs-review",
        };
    }
    const confidence = Math.min(1, Math.max(0, resolution.confidence));
    const status = confidence >= confidenceThreshold ? "auto-resolved" : "needs-review";
    return {
        id,
        file: conflict.file,
        startLine: conflict.startLine,
        endLine: conflict.endLine,
        head: conflict.head,
        incoming: conflict.incoming,
        confidence,
        resolution: resolution.resolution,
        reasoning: resolution.reasoning,
        status,
    };
}
export function assembleTickets(results, confidenceThreshold) {
    return results.map((r, index) => assembleTicket(r.conflict, r.result, r.error, index, confidenceThreshold));
}
//# sourceMappingURL=assembler.js.map