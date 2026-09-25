"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_TICKETS } from "@/lib/mock-data";
import StatusBadge from "@/components/StatusBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import DiffPanel from "@/components/DiffPanel";
import ResolutionBlock from "@/components/ResolutionBlock";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const ticket = MOCK_TICKETS.find((t) => t.id === id);

  if (!ticket) {
    notFound();
  }

  const [decision, setDecision] = useState<"approved" | "rejected" | null>(
    null
  );

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <span>←</span>
        Back to tickets
      </Link>

      {/* Header */}
      <div
        className="h-px mb-6 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #1e6fff 0%, #00b4ff 50%, transparent 100%)",
        }}
      />
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-text-muted mb-1">{ticket.id}</p>
          <h1 className="text-xl font-semibold text-text-primary font-mono">
            {ticket.file}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={ticket.status} />
          <ConfidenceBar value={ticket.confidence} />
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-8 bg-surface border border-border rounded-lg p-5">
        <h3 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          Reasoning
        </h3>
        <p className="text-sm text-text-primary leading-relaxed">
          {ticket.reasoning}
        </p>
      </div>

      {/* Diff sides */}
      <div className="mb-8">
        <DiffPanel head={ticket.head} incoming={ticket.incoming} />
      </div>

      {/* Resolution */}
      <div className="mb-8">
        <ResolutionBlock code={ticket.resolution} />
      </div>

      {/* Approve / Reject actions */}
      <div className="border-t border-border pt-6">
        {decision === null ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDecision("approved")}
              className="px-5 py-2.5 rounded-md text-sm font-medium bg-status-resolved-bg text-status-resolved border border-status-resolved/40 hover:bg-status-resolved/20 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setDecision("rejected")}
              className="px-5 py-2.5 rounded-md text-sm font-medium bg-surface border border-border text-text-muted hover:text-text-primary hover:border-border transition-colors"
            >
              ✗ Reject
            </button>
            <p className="text-xs text-text-muted ml-2">
              Approve to apply this resolution to the source file.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border ${
                decision === "approved"
                  ? "bg-status-resolved-bg text-status-resolved border-status-resolved/40"
                  : "bg-surface-raised text-text-muted border-border"
              }`}
            >
              {decision === "approved" ? "✓ Approved" : "✗ Rejected"}
            </div>
            <button
              onClick={() => setDecision(null)}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
