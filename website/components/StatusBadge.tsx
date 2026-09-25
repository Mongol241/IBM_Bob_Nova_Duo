import { TicketStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: TicketStatus;
}

const config: Record<TicketStatus, { label: string; classes: string; dotColor: string }> = {
  "auto-resolved": {
    label: "Auto-Resolved",
    classes:
      "bg-status-resolved-bg text-status-resolved border border-status-resolved/30",
    dotColor: "#22c55e",
  },
  "needs-review": {
    label: "Needs Review",
    classes:
      "bg-status-review-bg text-status-review border border-status-review/30",
    dotColor: "#f59e0b",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes, dotColor } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
