"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Calendar, Newspaper, X } from "lucide-react";
import { formatNewsDate, type NewsItem, sourceKindLabel } from "./news-utils";
import { NewsImageWithFallback } from "./NewsImage";

type Props = {
  item: NewsItem;
  onClose: () => void;
};

export function NewsDetailModal({ item, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const kindLabel = sourceKindLabel(item.kind);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onOut = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOut);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOut);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        ref={panelRef}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Newspaper className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs font-semibold text-primary">{item.source}</p>
              {kindLabel && (
                <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {kindLabel}
                </span>
              )}
            </div>
            <h2 className="mt-0.5 text-sm font-bold leading-snug text-text">
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-muted hover:bg-background hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <NewsImageWithFallback
            imageUrl={item.imageUrl}
            title={item.title}
            variant="modal"
          />
          {item.pubDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar className="h-3.5 w-3.5" />
              {formatNewsDate(item.pubDate)}
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted">
            {item.summary || "Özet mevcut değil."}
          </p>
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-3">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Haberi Oku
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:bg-background"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
