import Link from "next/link";
import { Ticket } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import ConfidenceBar from "./ConfidenceBar";

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="group relative block aspect-square bg-surface border border-border rounded-lg p-4 hover:border-accent-blue/50 hover:bg-surface-raised transition-all flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
      aria-label={`View conflict ${ticket.id} in ${ticket.file}`}
    >
      {/* Approved / Rejected badge */}
      {ticket.approved && (
        <span
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-status-resolved-bg border border-status-resolved/40 flex items-center justify-center"
          title="Approved"
          aria-label="Approved"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 5l2.5 2.5L8 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {ticket.rejected && !ticket.approved && (
        <span
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-surface-raised border border-border flex items-center justify-center"
          title="Rejected"
          aria-label="Rejected"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M3 3l4 4M7 3l-4 4" stroke="#6b8ab0" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-text-muted/50">
          {ticket.id}
        </span>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <p className="text-sm font-mono text-text-primary truncate group-hover:text-accent-cyan transition-colors mb-2">
            {ticket.file}
          </p>
          <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
            {ticket.reasoning}
          </p>
        </div>

        <div className="mt-auto pt-2">
          <ConfidenceBar value={ticket.confidence} />
        </div>
      </div>
    </Link>
  );
}
