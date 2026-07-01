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
