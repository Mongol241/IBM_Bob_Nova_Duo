"use client";

import { useState } from "react";
import { MOCK_TICKETS } from "@/lib/mock-data";
import { TicketStatus } from "@/lib/types";
import TicketCard from "@/components/TicketCard";

type FilterValue = "all" | TicketStatus;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Auto-Resolved", value: "auto-resolved" },
  { label: "Needs Review", value: "needs-review" },
];

export default function TicketsPage() {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered =
    filter === "all"
      ? MOCK_TICKETS
      : MOCK_TICKETS.filter((t) => t.status === filter);

  const autoCount = MOCK_TICKETS.filter(
    (t) => t.status === "auto-resolved"
  ).length;
  const reviewCount = MOCK_TICKETS.filter(
    (t) => t.status === "needs-review"
  ).length;

  return (
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

          {/* Run button — disabled until CLI is connected */}
          <button
            disabled
            title="CLI not yet connected — available in a future phase"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-surface border border-border text-text-muted opacity-50 cursor-not-allowed select-none"
          >
            <span className="text-base leading-none">▶</span>
            Run Resolver
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
  );
}
