interface ResolutionBlockProps {
  code: string;
}

export default function ResolutionBlock({ code }: ResolutionBlockProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wider">
        Proposed Resolution
      </h3>
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "rgba(0, 180, 255, 0.3)" }}
      >
        <div className="px-4 py-2 bg-surface-raised border-b border-border">
          <span
            className="text-xs font-mono font-semibold uppercase tracking-wider"
            style={{ color: "#00b4ff" }}
          >
            Resolution
          </span>
        </div>
        <pre className="p-4 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre leading-relaxed bg-surface">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
