"use client";

import { useState } from "react";

interface ResolutionBlockProps {
  code: string;
}

export default function ResolutionBlock({ code }: ResolutionBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div>
      <h3 className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wider">
        Proposed Resolution
      </h3>
      <div className="rounded-lg border overflow-hidden border-accent-cyan/30">
        <div className="px-4 py-2 bg-surface-raised border-b border-border flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-cyan">
            Resolution
          </span>
          <span className="ml-auto text-xs font-mono text-text-muted/50 tabular-nums">
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
          <button
            onClick={handleCopy}
            className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-blue"
            aria-label={copied ? "Copied" : "Copy resolution to clipboard"}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-status-resolved">Copied</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <rect x="4" y="1" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="1" y="3" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="#131f35" />
                </svg>
                Copy
              </>
            )}
          </button>
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
    </div>
  );
}
