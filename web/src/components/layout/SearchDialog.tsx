"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, MessageSquare, Calendar, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

interface SearchResult {
  id: string;
  type: "forum" | "event" | "business" | "user";
  title: string;
  subtitle?: string;
  link: string;
}

interface RawSearchResponse {
  topics?: { id: string; title: string; category?: { name: string } }[];
  events?: { id: string; title: string; city?: { name: string } }[];
  businesses?: { id: string; name: string; category?: { name: string } }[];
  users?: { id: string; profile?: { displayName: string; city?: { name: string } | null } | null }[];
}

const TYPE_ICONS = {
  forum: MessageSquare,
  event: Calendar,
  business: Store,
  user: Users,
} as const;

const TYPE_LABELS = {
  forum: "Forum",
  event: "Etkinlik",
  business: "İşletme",
  user: "Kullanıcı",
} as const;

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(async (query: string) => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(query)}`,
        { credentials: "include" },
      );
      const data: RawSearchResponse = await res.json();
      const items: SearchResult[] = [
        ...(data.topics ?? []).map((t) => ({
          id: `forum-${t.id}`,
          type: "forum" as const,
          title: t.title,
          subtitle: t.category?.name,
          link: `/forum/${t.id}`,
        })),
        ...(data.events ?? []).map((e) => ({
          id: `event-${e.id}`,
          type: "event" as const,
          title: e.title,
          subtitle: e.city?.name,
          link: `/etkinlikler/${e.id}`,
        })),
        ...(data.businesses ?? []).map((b) => ({
          id: `biz-${b.id}`,
          type: "business" as const,
          title: b.name,
          subtitle: b.category?.name,
          link: `/rehber/${b.id}`,
        })),
        ...(data.users ?? []).map((u) => ({
          id: `user-${u.id}`,
          type: "user" as const,
          title: u.profile?.displayName ?? "Kullanıcı",
          subtitle: u.profile?.city?.name ?? undefined,
          link: `/profil/${u.id}`,
        })),
      ].slice(0, 8);
      setResults(items);
      setSelected(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(q), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, fetchResults]);

  // Cmd/Ctrl+K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function handleKeyNav(e: React.KeyboardEvent) {
    const total = results.length + 1; // +1 for "search all" option
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selected < results.length) {
        const item = results[selected];
        setOpen(false);
        router.push(item.link);
      } else {
        submitSearch();
      }
    }
  }

  function submitSearch() {
    const value = q.trim();
    if (value.length < 2) return;
    setOpen(false);
    router.push(`/ara?q=${encodeURIComponent(value)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:text-text sm:px-3"
        aria-label="Ara (Ctrl+K)"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">Ara</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted lg:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3">
              <Search className={cn("h-5 w-5 flex-shrink-0", loading ? "animate-pulse text-primary" : "text-muted")} />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={handleKeyNav}
                placeholder="Forum, etkinlik, işletme, kullanıcı ara…"
                className="flex-1 bg-transparent py-1 text-base outline-none placeholder:text-muted"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-text"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick results */}
            {results.length > 0 && (
              <ul className="border-t border-border">
                {results.map((item, i) => {
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.link}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-background",
                          i === selected && "bg-background",
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium text-text leading-tight">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted">
                              {TYPE_LABELS[item.type]} · {item.subtitle}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer / search all */}
            <div className={cn(
              "flex items-center justify-between border-t border-border px-4 py-2",
              results.length === 0 && "border-t-0",
            )}>
              {q.trim().length >= 2 ? (
                <button
                  type="button"
                  onClick={submitSearch}
                  className={cn(
                    "flex items-center gap-1.5 text-xs text-primary hover:underline",
                    selected === results.length && "font-semibold",
                  )}
                >
                  <Search className="h-3.5 w-3.5" />
                  &quot;{q}&quot; için tüm sonuçları gör
                </button>
              ) : (
                <span className="text-xs text-muted">En az 2 karakter yazın</span>
              )}
              <span className="text-xs text-muted">
                <kbd className="rounded border border-border px-1 py-0.5">↑↓</kbd> gezin ·{" "}
                <kbd className="rounded border border-border px-1 py-0.5">↵</kbd> seç ·{" "}
                <kbd className="rounded border border-border px-1 py-0.5">Esc</kbd> kapat
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
