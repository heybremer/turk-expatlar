"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatAvatar } from "./ChatAvatar";

type UserResult = {
  id: string;
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    city?: { name: string } | null;
    state?: { name: string } | null;
  } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewMessageModal({ open, onClose }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingDm, setStartingDm] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, onClose]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || !token) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get<UserResult[]>(`/users/search?q=${encodeURIComponent(query)}`, token);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, token]);

  async function startDm(userId: string) {
    if (!token) return;
    setStartingDm(userId);
    try {
      await api.post(`/chat/dm/${userId}`, {}, token);
      onClose();
      router.push(`/sohbet/dm/${userId}`);
    } catch {
      setStartingDm(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-20">
      <div ref={searchRef} className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-muted" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim veya kullanıcı adı ara…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <button type="button" onClick={onClose} className="text-muted hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-sm text-muted">En az 2 karakter girin</p>
          )}
          {query.trim().length >= 2 && searching && (
            <p className="px-4 py-6 text-center text-sm text-muted">Aranıyor…</p>
          )}
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">&ldquo;{query}&rdquo; için kullanıcı bulunamadı</p>
          )}
          {results.map((u) => {
            const name = u.profile?.displayName ?? "Kullanıcı";
            const location = [u.profile?.city?.name, u.profile?.state?.name].filter(Boolean).join(", ");
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => void startDm(u.id)}
                disabled={startingDm === u.id}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-background disabled:opacity-60"
              >
                <ChatAvatar name={name} url={u.profile?.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  {location && <p className="truncate text-xs text-muted">{location}</p>}
                </div>
                {startingDm === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                ) : (
                  <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
