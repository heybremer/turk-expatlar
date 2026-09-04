import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://api.turkexpatlar.de"
    : "http://localhost:3201");

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
  { path: "/hakkinda", priority: 0.5, freq: "monthly" },
  { path: "/iletisim", priority: 0.5, freq: "monthly" },
  { path: "/impressum", priority: 0.3, freq: "yearly" },
  { path: "/gizlilik", priority: 0.3, freq: "yearly" },
  { path: "/kullanim", priority: 0.3, freq: "yearly" },
  { path: "/forum/kurallar", priority: 0.4, freq: "monthly" },
] as const;

type Freq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

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
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { items?: T[] }).items)
  ) {
    return (raw as { items: T[] }).items;
  }
  return [];
}

function validDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const siteUrl = getSiteUrl();

  const base: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, freq }) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: freq as Freq,
      priority,
    }),
  );

  try {
    const [topicsRaw, eventsRaw, bizRaw, citiesRaw] = await Promise.all([
      fetchJson<unknown>(`${API_URL}/api/forum/topics?limit=200`),
      fetchJson<unknown>(`${API_URL}/api/events?limit=200`),
      fetchJson<unknown>(`${API_URL}/api/businesses?limit=200`),
      fetchJson<unknown>(`${API_URL}/api/locations/cities`),
    ]);

    const topicEntries: MetadataRoute.Sitemap = asList<{
      id?: string;
      updatedAt?: string;
      createdAt?: string;
    }>(topicsRaw)
      .filter(
        (
          topic,
        ): topic is { id: string; updatedAt?: string; createdAt?: string } =>
          Boolean(topic.id),
      )
      .map((topic) => ({
        url: `${siteUrl}/forum/${encodeURIComponent(topic.id)}`,
        lastModified: validDate(topic.updatedAt ?? topic.createdAt, now),
        changeFrequency: "weekly" as Freq,
        priority: 0.6,
      }));

    const eventEntries: MetadataRoute.Sitemap = asList<{
      id?: string;
      updatedAt?: string;
      createdAt?: string;
    }>(eventsRaw)
      .filter(
        (
          event,
        ): event is { id: string; updatedAt?: string; createdAt?: string } =>
          Boolean(event.id),
      )
      .map((event) => ({
        url: `${siteUrl}/etkinlikler/${encodeURIComponent(event.id)}`,
        lastModified: validDate(event.updatedAt ?? event.createdAt, now),
        changeFrequency: "weekly" as Freq,
        priority: 0.6,
      }));

    const bizEntries: MetadataRoute.Sitemap = asList<{
      id?: string;
      updatedAt?: string;
      createdAt?: string;
    }>(bizRaw)
      .filter(
        (
          business,
        ): business is {
          id: string;
          updatedAt?: string;
          createdAt?: string;
        } => Boolean(business.id),
      )
      .map((business) => ({
        url: `${siteUrl}/rehber/${encodeURIComponent(business.id)}`,
        lastModified: validDate(business.updatedAt ?? business.createdAt, now),
        changeFrequency: "monthly" as Freq,
        priority: 0.5,
      }));

    const cityEntries: MetadataRoute.Sitemap = asList<{ slug?: string }>(
      citiesRaw,
    )
      .filter((city): city is { slug: string } => Boolean(city.slug))
      .map((city) => ({
        url: `${siteUrl}/sehir/${encodeURIComponent(city.slug)}`,
        lastModified: now,
        changeFrequency: "weekly" as Freq,
        priority: 0.8,
      }));

    return [
      ...base,
      ...cityEntries,
      ...topicEntries,
      ...eventEntries,
      ...bizEntries,
    ];
  } catch {
    return base;
  }
}
