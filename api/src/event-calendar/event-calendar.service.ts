import { Injectable, Logger } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { cityMatchesFilter, FEATURED_CITIES, normalizeCityName } from './city-map';
import { getCacheConfig } from '../site-settings/runtime-config.store';

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  city: string;
  venue?: string;
  address?: string;
  cost?: string;
  costValue?: number;
  category?: string;
  categories: string[];
  imageUrl?: string;
  ticketUrl?: string;
  detailUrl: string;
  artist?: string;
  source: 'vasistdas' | 'platform';
};

type CacheEntry = {
  items: CalendarEvent[];
  fetchedAt: number;
};

const VASISTDAS_API = 'https://vasistdas.de/wp-json/tribe/events/v1/events';
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; TurkExpatlar/1.0; +https://turkexpatlar.de)',
  Accept: 'application/json',
};

type VasistdasEvent = {
  id: number;
  title: string;
  url: string;
  website?: string;
  start_date: string;
  end_date?: string;
  cost?: string;
  cost_details?: { values?: string[] };
  image?: { url?: string } | false;
  categories?: { name: string; slug: string }[];
  venue?: {
    venue?: string;
    address?: string;
    city?: string;
  };
  organizer?: { organizer?: string; image?: { url?: string } }[];
};

@Injectable()
export class EventCalendarService {
  private readonly logger = new Logger(EventCalendarService.name);
  private cache: CacheEntry | null = null;

  constructor(private prisma: PrismaService) {}

  async getEvents(params: {
    city?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<{ items: CalendarEvent[]; total: number; cities: string[]; categories: string[] }> {
    const all = await this.getAllEvents();
    const cities = this.extractCities(all);
    const categories = this.extractCategories(all);

    let filtered = all;

    if (params.city?.trim() && params.city.trim() !== 'Almanya') {
      filtered = filtered.filter((e) => cityMatchesFilter(e.city, params.city));
    }

    if (params.category?.trim()) {
      const cat = params.category.trim().toLowerCase();
      filtered = filtered.filter((e) =>
        e.categories.some((c) => c.toLowerCase() === cat || e.category?.toLowerCase() === cat),
      );
    }

    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.artist?.toLowerCase().includes(q),
      );
    }

    const limit = Math.min(params.limit ?? 200, 500);
    const items = filtered.slice(0, limit);

    return { items, total: filtered.length, cities, categories };
  }

  getFeaturedCities() {
    return [...FEATURED_CITIES];
  }

  clearCache() {
    this.cache = null;
    this.logger.log('Event calendar cache cleared');
  }

  private isCacheValid(fetchedAt: number): boolean {
    const { cacheEnabled, cacheTtlMs } = getCacheConfig();
    if (!cacheEnabled) return false;
    return Date.now() - fetchedAt < cacheTtlMs;
  }

  private async getAllEvents(): Promise<CalendarEvent[]> {
    if (this.cache && this.isCacheValid(this.cache.fetchedAt)) {
      return this.cache.items;
    }

    const [vasistdas, platform] = await Promise.allSettled([
      this.fetchVasistdasEvents(),
      this.fetchPlatformEvents(),
    ]);

    const items = [
      ...(vasistdas.status === 'fulfilled' ? vasistdas.value : []),
      ...(platform.status === 'fulfilled' ? platform.value : []),
    ];

    items.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    this.cache = { items, fetchedAt: Date.now() };
    return items;
  }

  private async fetchVasistdasEvents(): Promise<CalendarEvent[]> {
    const all: CalendarEvent[] = [];
    const today = new Date().toISOString().slice(0, 10);
    let page = 1;

    while (page <= 6) {
      try {
        const url = `${VASISTDAS_API}?per_page=50&page=${page}&start_date=${today}`;
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) break;

        const data = (await res.json()) as { events?: VasistdasEvent[] };
        const events = data.events ?? [];
        if (!events.length) break;

        for (const ev of events) {
          const mapped = this.mapVasistdasEvent(ev);
          if (mapped) all.push(mapped);
        }

        if (events.length < 50) break;
        page++;
      } catch (err) {
        this.logger.warn(`Vasistdas fetch page ${page}: ${(err as Error).message}`);
        break;
      }
    }

    this.logger.log(`Vasistdas: ${all.length} etkinlik yüklendi`);
    return all;
  }

  private async fetchPlatformEvents(): Promise<CalendarEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        status: EventStatus.PUBLISHED,
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
      take: 100,
      include: { city: true, state: true },
    });

    return events.map((ev) => ({
      id: `platform-${ev.id}`,
      title: ev.title,
      startDate: ev.startsAt.toISOString(),
      endDate: ev.endsAt?.toISOString(),
      city: ev.city?.name ?? ev.state?.name ?? 'Almanya',
      venue: ev.location ?? undefined,
      address: ev.location ?? undefined,
      cost: ev.priceType === 'FREE' ? 'Ücretsiz' : ev.priceAmount ? `${ev.priceAmount}€` : undefined,
      costValue: ev.priceAmount ?? undefined,
      category: 'Topluluk',
      categories: ['Topluluk'],
      imageUrl: undefined,
      ticketUrl: undefined,
      detailUrl: `/etkinlikler/${ev.id}`,
      source: 'platform' as const,
    }));
  }

  private mapVasistdasEvent(ev: VasistdasEvent): CalendarEvent | null {
    if (!ev.start_date || !ev.title) return null;

    const city = normalizeCityName(ev.venue?.city) || 'Almanya';
    const categories = (ev.categories ?? []).map((c) => c.name);
    const category = categories[0];
    const artist = ev.organizer?.[0]?.organizer;
    const imageUrl =
      (ev.image && typeof ev.image === 'object' ? ev.image.url : undefined) ??
      ev.organizer?.[0]?.image?.url;

    const costValue = ev.cost_details?.values?.[0]
      ? parseFloat(ev.cost_details.values[0].replace(',', '.'))
      : undefined;

    return {
      id: `vasistdas-${ev.id}`,
      title: this.decodeHtml(ev.title),
      startDate: ev.start_date.replace(' ', 'T'),
      endDate: ev.end_date?.replace(' ', 'T'),
      city,
      venue: ev.venue?.venue,
      address: ev.venue?.address,
      cost: ev.cost?.trim() || (costValue ? `${costValue}€` : undefined),
      costValue,
      category,
      categories,
      imageUrl,
      ticketUrl: ev.website || undefined,
      detailUrl: ev.url,
      artist: artist ? this.decodeHtml(artist) : undefined,
      source: 'vasistdas',
    };
  }

  private extractCities(events: CalendarEvent[]): string[] {
    const set = new Set<string>();
    for (const e of events) {
      const city = normalizeCityName(e.city);
      if (city && city !== 'Almanya') set.add(city);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }

  private extractCategories(events: CalendarEvent[]): string[] {
    const set = new Set<string>();
    for (const e of events) {
      for (const c of e.categories) {
        if (c) set.add(c);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }

  private decodeHtml(text: string): string {
    return text
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}
