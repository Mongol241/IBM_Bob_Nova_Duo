"use client";

import { useState, useEffect } from "react";
import { TicketStatus, Ticket } from "@/lib/types";
import TicketCard from "@/components/TicketCard";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/useToast";

type FilterValue = "all" | TicketStatus;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Auto-Resolved", value: "auto-resolved" },
  { label: "Needs Review", value: "needs-review" },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch tickets");
      setTickets(data);
    } catch (error: any) {
      addToast(error.message ?? "Failed to fetch tickets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleRunResolver = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resolver failed");
      await fetchTickets();
      addToast(`Resolved ${data.length} conflict${data.length !== 1 ? "s" : ""}`, "success");
    } catch (error: any) {
      addToast(error.message ?? "Failed to run resolver");
    } finally {
      setIsRunning(false);
    }
  };

  const filtered =
    filter === "all"
      ? tickets
      : tickets.filter((t) => t.status === filter);

  const autoCount = tickets.filter((t) => t.status === "auto-resolved").length;
  const reviewCount = tickets.filter((t) => t.status === "needs-review").length;

  return (
    <>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-text-muted animate-pulse">Loading tickets...</p>
        </div>
      ) : (
        <div>
          {/* Page header with gradient accent */}
          <div className="mb-8">
            <div
              className="h-px mb-6 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #1e6fff 0%, #00b4ff 50%, transparent 100%)",
              }}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
                  Merge Conflicts
                </h1>
                <p className="mt-1 text-sm text-text-muted">
                  {autoCount} auto-resolved &middot; {reviewCount} needs review
                </p>
              </div>

              <button
                onClick={handleRunResolver}
                disabled={isRunning}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isRunning
                    ? "bg-surface text-text-muted opacity-50 cursor-not-allowed"
                    : "bg-surface border border-border text-text-primary hover:bg-surface-raised"
                }`}
              >
                {isRunning ? (
                  <svg
                    className="animate-spin w-4 h-4 text-text-muted"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <span className="text-base leading-none">▶</span>
                )}
                {isRunning ? "Resolving..." : "Run Resolver"}
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-4 bg-surface border border-border rounded-lg p-1 w-fit">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === value
                    ? "bg-surface-raised text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ticket list */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-text-muted text-sm">
                No tickets match the selected filter.
              </p>
              <button
                onClick={() => setFilter("all")}
                className="mt-3 text-sm text-accent-blue hover:text-accent-cyan transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
