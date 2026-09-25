import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-5xl font-mono font-bold text-accent-blue mb-4">404</p>
      <p className="text-text-muted text-sm mb-6">Ticket not found.</p>
      <Link
        href="/tickets"
        className="text-sm text-accent-blue hover:text-accent-cyan transition-colors"
      >
        ← Back to tickets
      </Link>
    </div>
  );
}
