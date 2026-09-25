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
      className="group block aspect-square bg-surface border border-border rounded-lg p-4 hover:border-accent-blue/50 hover:bg-surface-raised transition-all flex flex-col"
    >
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
