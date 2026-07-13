import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("tr-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** "5 dk önce", "3 sa önce", "2 gün önce" biçiminde kısa göreli zaman. */
export function formatRelative(date: string | Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Intl.DateTimeFormat("tr-DE", { day: "numeric", month: "short" }).format(
    new Date(date),
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

/** API'den dönen upload URL'lerini tarayıcıda yüklenebilir hale getirir. */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${API_URL}${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${API_URL}${parsed.pathname}`;
    }
  } catch {
    return url;
  }
  return url;
}
