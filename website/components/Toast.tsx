"use client";

import { useEffect } from "react";

export type ToastVariant = "error" | "success";

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const ICONS: Record<ToastVariant, string> = {
  error: "✗",
  success: "✓",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.variant === "error";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm shadow-lg pointer-events-auto min-w-72 max-w-sm ${
        isError
          ? "bg-status-review-bg border-status-review/40 text-status-review"
          : "bg-status-resolved-bg border-status-resolved/40 text-status-resolved"
      }`}
    >
      <span className="font-bold leading-5 shrink-0">{ICONS[toast.variant]}</span>
      <p className="flex-1 leading-5 text-text-primary">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 leading-5 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
