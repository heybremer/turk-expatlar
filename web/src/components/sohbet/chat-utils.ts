import { RefObject, useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export const STATE_SLUGS: Record<string, string> = {
  "Baden-Württemberg": "baden-wuerttemberg", Bayern: "bayern", Berlin: "berlin",
  Brandenburg: "brandenburg", Bremen: "bremen", Hamburg: "hamburg",
  Hessen: "hessen", "Mecklenburg-Vorpommern": "mecklenburg-vorpommern",
  Niedersachsen: "niedersachsen", "Nordrhein-Westfalen": "nordrhein-westfalen",
  "Rheinland-Pfalz": "rheinland-pfalz", Saarland: "saarland",
  Sachsen: "sachsen", "Sachsen-Anhalt": "sachsen-anhalt",
  "Schleswig-Holstein": "schleswig-holstein", Thüringen: "thueringen",
};

export function toSlug(name: string) {
  return STATE_SLUGS[name] ?? name.toLowerCase()
    .replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  return `${Math.floor(diff / 86400)} gün`;
}

export type RoomItem = { href: string; label: string; type: "global" | "state" | "city" };

export const DELETED_USER_DISPLAY_NAME = "Silinmiş Kullanıcı";

export function isDeletedChatUser(displayName?: string | null): boolean {
  return displayName === DELETED_USER_DISPLAY_NAME;
}

export type DmEntry = {
  chatId: string;
  unread?: number;
  partner: {
    id: string;
    role?: string;
    profile?: { displayName: string; avatarUrl?: string | null } | null;
  } | null;
  lastMessage: { body: string; createdAt: string } | null;
};

export function scrollMessagesToBottom(container: HTMLElement | null, smooth = false) {
  if (!container) return;
  container.scrollTo({ top: container.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

/**
 * Mobil klavye açıldığında (görünür alan küçüldüğünde) kullanıcı yazıyorsa mesaj
 * listesini en alta sabitler; son mesajlar klavyenin arkasında kaybolmaz.
 * Viewport/body yükseklik senkronu MainWrapper'da global olarak yapılır.
 */
export function useKeyboardBottomPin<T extends HTMLElement>(containerRef: RefObject<T | null>) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let lastHeight = vv.height;
    const onResize = () => {
      const shrunk = vv.height < lastHeight - 50;
      lastHeight = vv.height;
      const ae = document.activeElement;
      const typing =
        ae instanceof HTMLElement && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA");
      if (shrunk && typing) {
        requestAnimationFrame(() => scrollMessagesToBottom(containerRef.current, false));
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [containerRef]);
}

export function markChatRead(
  chatId: string,
  token: string,
  connected: boolean,
) {
  const sock = getSocket(token);
  if (connected && sock.connected) {
    sock.emit("mark_read", { chatId });
  } else {
    void api.patch(`/chat/dm/${chatId}/read`, {}, token).catch(() => {});
  }
}

export type ModerationNoticePayload = {
  message?: string;
  code?: string;
  bannedUntil?: string;
  clearInput?: boolean;
};
