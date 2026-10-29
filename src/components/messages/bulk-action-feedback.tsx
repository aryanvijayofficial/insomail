"use client";

import { LoaderCircle, X } from "lucide-react";

/** Shared mail-action notice. Out of flow and away from toolbar controls. */
export function BulkActionFeedback({ message, pending, error = false, dismissLabel, onDismiss }: {
  message: string | null;
  pending: boolean;
  error?: boolean;
  dismissLabel: string;
  onDismiss(): void;
}) {
  if (!message) return null;
  return <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} aria-busy={pending} data-mail-action-notice className={`mail-action-notice${error ? " mail-action-notice-error" : ""}`}>
    {pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />}
    <span className="min-w-0 break-words">{message}</span>
    {!pending && <button type="button" className="mail-action-notice-dismiss" aria-label={dismissLabel} onClick={onDismiss}><X aria-hidden="true" size={16} /></button>}
  </div>;
}
