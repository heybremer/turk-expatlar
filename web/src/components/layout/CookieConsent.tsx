"use client";

import { useEffect, useState } from "react";
import { Cookie, ChevronDown, ChevronUp, X, Shield } from "lucide-react";
import Link from "next/link";
import {
  COOKIE_CATEGORIES,
  CookieCategory,
  acceptAll,
  getConsent,
  rejectAll,
  saveConsent,
} from "@/lib/cookie-consent";

type View = "banner" | "details";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>("banner");
  const [prefs, setPrefs] = useState<Record<CookieCategory, boolean>>({
    essential: true,
    functional: true,
    analytics: false,
    marketing: false,
  });
  const [expandedId, setExpandedId] = useState<CookieCategory | null>(null);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAcceptAll() {
    acceptAll();
    setVisible(false);
  }

  function handleRejectAll() {
    rejectAll();
    setVisible(false);
  }

  function handleSavePrefs() {
    saveConsent(prefs);
    setVisible(false);
  }

  function toggle(id: CookieCategory) {
    setPrefs((p) => ({ ...p, [id]: !p[id] }));
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop blur for details view */}
      {view === "details" && (
        <div
          className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm"
          onClick={() => setView("banner")}
        />
      )}

      <div
        className={`fixed z-[999] transition-all duration-300 ${
          view === "details"
            ? "inset-4 bottom-auto top-1/2 mx-auto max-w-lg -translate-y-1/2 rounded-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
            : // Mobilde alt navigasyonun üstünde kalsın (bar ~4.5rem + safe area)
              "bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] left-4 right-4 mx-auto max-w-2xl rounded-2xl md:bottom-4"
        } border border-border bg-surface shadow-2xl`}
      >
        {view === "banner" ? (
          /* ── BANNER ── */
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="mb-1 font-semibold">Çerezleri Kullanıyoruz</p>
                <p className="text-sm text-muted">
                  Deneyiminizi kişiselleştirmek ve siteyi iyileştirmek için çerezler
                  kullanıyoruz.{" "}
                  <Link href="/gizlilik" className="underline hover:text-primary">
                    Gizlilik politikamızı
                  </Link>{" "}
                  okuyabilirsiniz.
                </p>
              </div>
              <button
                onClick={handleRejectAll}
                className="ml-1 mt-0.5 shrink-0 rounded-lg p-1 text-muted hover:bg-background hover:text-foreground"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleAcceptAll}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Tümünü Kabul Et
              </button>
              <button
                onClick={handleRejectAll}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Yalnızca Zorunlular
              </button>
              <button
                onClick={() => setView("details")}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary hover:text-foreground"
              >
                Özelleştir
              </button>
            </div>
          </div>
        ) : (
          /* ── DETAILS ── */
          <div className="max-h-[80vh] overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Çerez Tercihleri</h2>
              </div>
              <button
                onClick={() => setView("banner")}
                className="rounded-lg p-1 text-muted hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted">
              Hangi çerez kategorilerine izin vermek istediğinizi seçin. Zorunlu çerezler her
              zaman aktiftir.
            </p>

            <div className="space-y-2">
              {COOKIE_CATEGORIES.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-border bg-background">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                  >
                    {/* Toggle */}
                    <div className="shrink-0" onClick={(e) => !cat.required && e.stopPropagation()}>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={prefs[cat.id]}
                          disabled={cat.required}
                          onChange={() => !cat.required && toggle(cat.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div
                          className={`h-5 w-9 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4 ${
                            prefs[cat.id]
                              ? "bg-primary"
                              : "bg-muted/30"
                          } ${cat.required ? "opacity-60 cursor-not-allowed" : ""}`}
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {cat.label}
                        {cat.required && (
                          <span className="ml-2 text-xs text-muted">(Zorunlu)</span>
                        )}
                      </p>
                    </div>

                    {expandedId === cat.id ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                    )}
                  </button>

                  {expandedId === cat.id && (
                    <p className="border-t border-border px-4 pb-3 pt-2 text-sm text-muted">
                      {cat.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={handleSavePrefs}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Seçimi Kaydet
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary"
              >
                Tümünü Kabul Et
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
