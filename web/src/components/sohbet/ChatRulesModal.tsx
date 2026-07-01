"use client";

import { useEffect, useRef } from "react";
import { ScrollText, X } from "lucide-react";
import { ChatRulesContent } from "./chat-rules-content";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChatRulesModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 sm:py-16">
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="chat-rules-title"
        className="flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ScrollText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="chat-rules-title" className="text-base font-bold text-text">
              Sohbet Kuralları
            </h2>
            <p className="text-xs text-muted">Topluluk standartları ve moderasyon</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-text"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ChatRulesContent />
        </div>
        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
