"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { io } from "socket.io-client";
import { api, NotificationList } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationList>({ items: [], unreadCount: 0 });
  const ref = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<NotificationList>("/notifications", token);
      setData(res);
    } catch (err) {
      console.error("[NotificationBell] fetch failed", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [token, refresh]);

  // Gerçek zamanlı bildirim dinleyicisi
  useEffect(() => {
    if (!token) return;

    const sock = io(`${API_URL}/notifications`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });

    sock.on("notification", (notif: { id: string; title: string; body: string; link?: string; createdAt: string }) => {
      setData((prev) => ({
        items: [{ ...notif, read: false }, ...prev.items].slice(0, 20),
        unreadCount: prev.unreadCount + 1,
      }));
    });

    return () => {
      sock.disconnect();
    };
  }, [token]);

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

  async function markRead(id: string) {
    if (!token) return;
    try {
      await api.patch(`/notifications/${id}/read`, {}, token);
      setData((d) => ({
        items: d.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, d.unreadCount - 1),
      }));
    } catch (err) {
      console.error("[NotificationBell] markRead failed", err);
    }
  }

  async function markAllRead() {
    if (!token) return;
    try {
      await api.patch("/notifications/read-all", {}, token);
      setData((d) => ({
        items: d.items.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("[NotificationBell] markAllRead failed", err);
    }
  }

  if (!token) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-background"
        aria-label="Bildirimler"
      >
        <Bell className="h-5 w-5 text-muted" />
        {data.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Bildirimler</span>
            {data.unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="h-3 w-3" />
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                Bildirim yok.
              </p>
            ) : (
              data.items.map((n) => {
                const Content = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-background",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                    )}
                    <div className={cn("flex-1", n.read && "ml-5")}>
                      <p className="text-sm font-medium text-text">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-muted">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      if (!n.read) void markRead(n.id);
                      setOpen(false);
                    }}
                    className="block border-b border-border last:border-b-0"
                  >
                    {Content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="block w-full border-b border-border text-left last:border-b-0"
                  >
                    {Content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
