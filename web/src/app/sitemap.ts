import type { MetadataRoute } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

const STATIC_ROUTES = [
  { path: "", priority: 1.0, freq: "daily" },
  { path: "/forum", priority: 0.9, freq: "daily" },
  { path: "/etkinlikler", priority: 0.8, freq: "daily" },
  { path: "/rehber", priority: 0.8, freq: "weekly" },
  { path: "/isler", priority: 0.7, freq: "weekly" },
  { path: "/seyahat", priority: 0.6, freq: "weekly" },
  { path: "/sohbet", priority: 0.6, freq: "weekly" },
  { path: "/uygulamalar", priority: 0.6, freq: "monthly" },
  { path: "/uygulamalar/konsolosluklar", priority: 0.5, freq: "monthly" },
  { path: "/uygulamalar/resmi-kurumlar", priority: 0.5, freq: "monthly" },
  { path: "/uygulamalar/gezgin-rehberi", priority: 0.5, freq: "monthly" },
  { path: "/uyelik", priority: 0.7, freq: "monthly" },
  { path: "/impressum", priority: 0.3, freq: "yearly" },
  { path: "/gizlilik", priority: 0.3, freq: "yearly" },
  { path: "/kullanim", priority: 0.3, freq: "yearly" },
  { path: "/forum/kurallar", priority: 0.4, freq: "monthly" },
] as const;

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 43200 } }); // 12h cache
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function asList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: T[] }).items)) {
    return (raw as { items: T[] }).items;
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const base: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, freq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: freq as Freq,
    priority,
  }));

  // Forum konuları
  const topicsRaw = await fetchJson<unknown>(`${API_URL}/api/forum/topics?limit=200`);
  const topicEntries: MetadataRoute.Sitemap = asList<{ id: string; updatedAt?: string; createdAt: string }>(topicsRaw).map((t) => ({
    url: `${SITE_URL}/forum/${t.id}`,
    lastModified: new Date(t.updatedAt ?? t.createdAt),
    changeFrequency: "weekly" as Freq,
    priority: 0.6,
  }));

  // Etkinlikler
  const eventsRaw = await fetchJson<unknown>(`${API_URL}/api/events?limit=200`);
  const eventEntries: MetadataRoute.Sitemap = asList<{ id: string; updatedAt?: string; createdAt: string }>(eventsRaw).map((e) => ({
    url: `${SITE_URL}/etkinlikler/${e.id}`,
    lastModified: new Date(e.updatedAt ?? e.createdAt),
    changeFrequency: "weekly" as Freq,
    priority: 0.6,
  }));

  // İşletme rehberi
  const bizRaw = await fetchJson<unknown>(`${API_URL}/api/businesses?limit=200`);
  const bizEntries: MetadataRoute.Sitemap = asList<{ id: string; updatedAt?: string; createdAt: string }>(bizRaw).map((b) => ({
    url: `${SITE_URL}/rehber/${b.id}`,
    lastModified: new Date(b.updatedAt ?? b.createdAt),
    changeFrequency: "monthly" as Freq,
    priority: 0.5,
  }));

  // Şehirler
  const citiesRaw = await fetchJson<unknown>(`${API_URL}/api/locations/cities`);
  const cityEntries: MetadataRoute.Sitemap = asList<{ slug: string }>(citiesRaw).map((c) => ({
    url: `${SITE_URL}/sehir/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as Freq,
    priority: 0.8,
  }));

  return [...base, ...cityEntries, ...topicEntries, ...eventEntries, ...bizEntries];
}
