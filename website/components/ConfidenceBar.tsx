interface ConfidenceBarProps {
  value: number; // 0–1
}

export default function ConfidenceBar({ value }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const isHigh = value >= 0.8;

  return (
    <div className="flex items-center gap-2" title={`Confidence: ${pct}%`}>
      <div className="w-20 h-1.5 rounded-full bg-surface-raised overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isHigh
              ? "linear-gradient(90deg, #1e6fff, #00b4ff)"
              : "#f59e0b",
          }}
        />
      </div>
      <span
        className={`text-xs font-mono tabular-nums ${
          isHigh ? "text-accent-cyan" : "text-status-review"
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}
