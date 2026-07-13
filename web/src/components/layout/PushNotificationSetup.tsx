"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationSetup() {
  const { token, user } = useAuth();
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || !user || dismissed) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") {
      setSubscribed(true);
      void registerSW();
      return;
    }
    if (Notification.permission !== "denied") {
      // Kullanıcı henüz karar vermedi — banner göster
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [token, user, dismissed]);

  async function registerSW() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      if (existing) return existing;
    } catch {
      // SW kayıt hatası
    }
  }

  async function subscribe() {
    try {
      const res = await fetch(`${API_URL}/api/notifications/vapid-public-key`);
      const { publicKey } = await res.json() as { publicKey: string };
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${API_URL}/api/notifications/push-subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
          },
        }),
      });

      setSubscribed(true);
      setShow(false);
    } catch {
      setShow(false);
    }
  }

  async function requestAndSubscribe() {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await subscribe();
    } else {
      setShow(false);
      setDismissed(true);
    }
  }

  if (!show || subscribed) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] right-4 z-50 w-[calc(100vw-2rem)] max-w-xs rounded-2xl border border-border bg-surface p-4 shadow-xl md:bottom-6 md:w-80 md:max-w-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Bildirimleri Aç</p>
            <p className="mt-0.5 text-xs text-muted">
              Cevap ve etiketlemelerden haberdar ol
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShow(false); setDismissed(true); }}
          className="shrink-0 rounded p-1 text-muted hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={requestAndSubscribe}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Bell className="h-4 w-4" /> Etkinleştir
        </button>
        <button
          onClick={() => { setShow(false); setDismissed(true); }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-text"
        >
          <BellOff className="h-4 w-4" /> Hayır
        </button>
      </div>
    </div>
  );
}
