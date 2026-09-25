"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isTickets = pathname.startsWith("/tickets");

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      {/* Bob helmet gradient accent line */}
      <div
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, #0f1729 0%, #1e6fff 40%, #00b4ff 100%)",
        }}
      />
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo placeholder */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-md border-2 border-accent-blue flex items-center justify-center text-accent-cyan text-xs font-mono font-bold select-none">
            LOGO
          </div>
          <span className="text-text-primary font-semibold text-base tracking-tight">
            Conflict Resolver
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/tickets"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isTickets
                ? "bg-surface-raised text-text-primary"
                : "text-text-muted hover:text-text-primary hover:bg-surface-raised"
            }`}
          >
            Tickets
          </Link>
        </nav>
      </div>
    </header>
  );
}
