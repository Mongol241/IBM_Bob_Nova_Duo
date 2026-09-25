"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import DiffPanel from "@/components/DiffPanel";
import ResolutionBlock from "@/components/ResolutionBlock";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/useToast";
import { Ticket } from "@/lib/types";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    async function loadTicket() {
      try {
        const res = await fetch(`/api/tickets`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load ticket");
        const found: Ticket | undefined = Array.isArray(data) ? data.find((t: Ticket) => t.id === id) : data;
        setTicket(found ?? null);
        if (found?.approved) setDecision("approved");
      } catch (error: any) {
        addToast(error.message ?? "Failed to load ticket");
      } finally {
        setIsLoading(false);
      }
    }
    loadTicket();
  }, [id]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply resolution");
      setDecision("approved");
      setTicket((prev) => prev ? { ...prev, approved: true } : null);
      addToast("Resolution applied to source file", "success");
    } catch (error: any) {
      addToast(error.message ?? "Failed to approve ticket");
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Toast toasts={toasts} onDismiss={dismiss} />
        <div className="flex items-center justify-center py-24">
          <p className="text-text-muted animate-pulse">Loading ticket details...</p>
        </div>
      </>
    );
  }

  if (!ticket) {
    notFound();
  }

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />
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
        {decision === null && !ticket.approved ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              aria-label={isApproving ? "Applying resolution…" : "Approve and apply resolution to source file"}
              className="px-5 py-2.5 rounded-md text-sm font-medium bg-status-resolved-bg text-status-resolved border border-status-resolved/40 hover:bg-status-resolved/20 transition-colors disabled:opacity-50"
            >
              {isApproving ? "Applying..." : "✓ Approve"}
            </button>
            <button
              type="button"
              onClick={() => setDecision("rejected")}
              aria-label="Reject this resolution"
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
                decision === "approved" || ticket.approved
                  ? "bg-status-resolved-bg text-status-resolved border-status-resolved/40"
                  : "bg-surface-raised text-text-muted border-border"
              }`}
            >
              {decision === "approved" || ticket.approved ? "✓ Approved" : "✗ Rejected"}
            </div>
            <button
              type="button"
              onClick={() => setDecision(null)}
              aria-label="Undo decision"
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
