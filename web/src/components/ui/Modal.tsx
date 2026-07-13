"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Paylaşılan modal kabuğu: küçük ekranlarda taşmayı önlemek için
 * max-h + iç kaydırma, Escape/backdrop ile kapanma, arka plan kaydırma
 * kilidi ve temel dialog erişilebilirliği sağlar.
 */
export function Modal({
  title,
  onClose,
  children,
  maxWidthClass = "max-w-md",
  showCloseButton = true,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  showCloseButton?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    // Arka plan kaydırmasını kilitle
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[min(85vh,100dvh-2rem)] w-full ${maxWidthClass} flex-col rounded-2xl border border-border bg-surface shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <h3 id={titleId} className="min-w-0 break-words text-lg font-semibold">
            {title}
          </h3>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-background hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
