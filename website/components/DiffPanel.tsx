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

  const lines = code.split("\n");

  return (
    <div className={`flex-1 min-w-0 rounded-lg border ${borderColor} overflow-hidden`}>
      <div className="px-4 py-2 bg-surface-raised border-b border-border flex items-center gap-2">
        <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
        <span className="ml-auto text-xs font-mono text-text-muted/50 tabular-nums">
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
      </div>
      <div className="overflow-x-auto bg-surface">
        <table className="w-full border-collapse text-xs font-mono leading-relaxed">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="group">
                <td
                  className="select-none text-right text-text-muted/40 px-3 py-0 w-10 border-r border-border group-hover:text-text-muted/70 transition-colors"
                  aria-hidden="true"
                >
                  {i + 1}
                </td>
                <td className="px-4 py-0 text-text-primary whitespace-pre">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DiffPanel({ head, incoming }: DiffPanelProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wider">
        Conflict Sides
      </h3>
      <div className="flex gap-4 flex-col md:flex-row">
        <CodePane label="HEAD (current)" code={head} variant="head" />
        <CodePane label="Incoming" code={incoming} variant="incoming" />
      </div>
    </div>
  );
}
