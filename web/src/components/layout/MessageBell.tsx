"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, UserCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type DmItem = {
  chatId: string;
  unread: number;
  partner?: {
    id: string;
    profile?: { displayName: string; avatarUrl?: string | null } | null;
  } | null;
  lastMessage?: {
    body: string;
    createdAt: string;
  } | null;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  return `${Math.floor(diff / 86400)} gün`;
}

export function MessageBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [dms, setDms] = useState<DmItem[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [list, countRes] = await Promise.all([
        api.get<DmItem[]>("/chat/dm/list", token),
        api.get<{ count: number }>("/chat/dm/unread-count", token),
      ]);
      setDms(list);
      setTotalUnread(countRes.count);
    } catch {
      // sessizce yoksay
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [token, refresh]);

  // dışarı tıklayınca / dokununca veya Escape ile kapat
  useEffect(() => {
    function onClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleOpen(chatId: string) {
    setOpen(false);
    // bu konuşmayı okundu say
    try {
      await api.patch(`/chat/dm/${chatId}/read`, {}, token!);
      setDms((prev) =>
        prev.map((d) => (d.chatId === chatId ? { ...d, unread: 0 } : d)),
      );
      setTotalUnread((n) => Math.max(0, n - (dms.find((d) => d.chatId === chatId)?.unread ?? 0)));
    } catch {
      // sessiz
    }
  }

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-background"
        aria-label="Mesajlar"
      >
        <MessageCircle className="h-5 w-5 text-muted" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Mesajlar</span>
            <Link
              href="/sohbet/mesajlarim"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              Tümünü gör
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {dms.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                Henüz mesajınız yok.
              </p>
            ) : (
              dms.map((dm) => {
                const name = dm.partner?.profile?.displayName ?? "Kullanıcı";
                const avatar = dm.partner?.profile?.avatarUrl;
                const partnerId = dm.partner?.id;
                return (
                  <Link
                    key={dm.chatId}
                    href={`/sohbet/dm/${partnerId ?? dm.chatId}`}
                    onClick={() => void handleOpen(dm.chatId)}
                    className={cn(
                      "flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-background last:border-b-0",
                      dm.unread > 0 && "bg-primary/5",
                    )}
                  >
                    {/* Avatar */}
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-border">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-5 w-5 text-muted" />
                      )}
                    </div>

                    {/* İçerik */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn("truncate text-sm", dm.unread > 0 ? "font-semibold" : "font-medium")}>
                          {name}
                        </p>
                        {dm.lastMessage && (
                          <span className="flex-shrink-0 text-xs text-muted">
                            {timeAgo(dm.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {dm.lastMessage && (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {dm.lastMessage.body}
                        </p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {dm.unread > 0 && (
                      <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {dm.unread > 9 ? "9+" : dm.unread}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
