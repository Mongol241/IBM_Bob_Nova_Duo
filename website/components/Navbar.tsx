"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isTickets = pathname.startsWith("/tickets");

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      {/* Top gradient accent line */}
      <div
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, #0f1729 0%, #1e6fff 40%, #00b4ff 100%)",
        }}
      />
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link
          href="/tickets"
          className="flex items-center gap-3 shrink-0 group"
          aria-label="Go to ticket list"
        >
          {/* IBM Bob-styled hex mark */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="7" fill="#0f1729" stroke="#1e6fff" strokeWidth="1.5" />
            {/* Git branch fork icon */}
            <circle cx="11" cy="10" r="2.5" fill="#1e6fff" />
            <circle cx="11" cy="22" r="2.5" fill="#00b4ff" />
            <circle cx="21" cy="14" r="2.5" fill="#00b4ff" />
            <path d="M11 12.5V19.5" stroke="#1e6fff" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 12.5 C11 15.5 21 12.5 21 14" stroke="#1e6fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <span className="text-text-primary font-semibold text-base tracking-tight group-hover:text-accent-cyan transition-colors">
            Conflict Resolver
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-4" aria-label="Primary navigation">
          <Link
            href="/tickets"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isTickets
                ? "bg-surface-raised text-text-primary"
                : "text-text-muted hover:text-text-primary hover:bg-surface-raised"
            }`}
            aria-current={isTickets ? "page" : undefined}
          >
            Tickets
          </Link>
        </nav>
      </div>
    </header>
  );
}
