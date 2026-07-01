"use client";

import { AlertTriangle, Ban, X } from "lucide-react";

export function ModerationNotice({
  message,
  code,
  onDismiss,
}: {
  message: string;
  code?: string;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  const isBan = code === "AUTO_BANNED" || code === "BANNED";

  return (
    <div
      className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        isBan
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
      }`}
    >
      {isBan ? (
        <Ban className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p className="flex-1 font-medium">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
