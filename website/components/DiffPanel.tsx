interface DiffPanelProps {
  head: string;
  incoming: string;
}

function CodePane({
  label,
  code,
  variant,
}: {
  label: string;
  code: string;
  variant: "head" | "incoming";
}) {
  const borderColor =
    variant === "head" ? "border-accent-blue/40" : "border-accent-cyan/40";
  const labelColor =
    variant === "head" ? "text-accent-blue" : "text-accent-cyan";

  return (
    <div className={`flex-1 min-w-0 rounded-lg border ${borderColor} overflow-hidden`}>
      <div className="px-4 py-2 bg-surface-raised border-b border-border flex items-center gap-2">
        <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
      </div>
      <pre className="p-4 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre leading-relaxed bg-surface">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DiffPanel({ head, incoming }: DiffPanelProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider text-xs">
        Conflict Sides
      </h3>
      <div className="flex gap-4 flex-col md:flex-row">
        <CodePane label="HEAD (current)" code={head} variant="head" />
        <CodePane label="Incoming" code={incoming} variant="incoming" />
      </div>
    </div>
  );
}
