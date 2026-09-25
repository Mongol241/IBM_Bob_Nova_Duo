import { TicketStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: TicketStatus;
}

const config: Record<TicketStatus, { label: string; classes: string }> = {
  "auto-resolved": {
    label: "Auto-Resolved",
    classes:
      "bg-status-resolved-bg text-status-resolved border border-status-resolved/30",
  },
  "needs-review": {
    label: "Needs Review",
    classes:
      "bg-status-review-bg text-status-review border border-status-review/30",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes } = config[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
