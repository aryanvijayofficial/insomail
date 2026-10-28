"use client";

import { LoaderCircle } from "lucide-react";

export function BulkActionFeedback({ message, pending, error = false, dismissLabel, onDismiss }: {
  message: string | null;
  pending: boolean;
  error?: boolean;
  dismissLabel: string;
  onDismiss(): void;
}) {
  if (!message) return null;
  return <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} aria-busy={pending} className={`absolute inset-x-0 top-0 z-40 flex min-h-14 items-center justify-center gap-2 rounded-t-3xl border-b bg-white px-4 py-2 text-sm font-medium shadow-lg ${error ? "border-red-200 text-red-700" : "border-neutral-200 text-neutral-900"}`}>
    {pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />}
    <span>{message}</span>
    {!pending && <button type="button" className="ml-2 rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100" aria-label={dismissLabel} onClick={onDismiss}>×</button>}
  </div>;
}
