import { Injectable, Logger } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  cityMatchesFilter,
  FEATURED_CITIES,
  normalizeCityName,
} from './city-map';
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
  source: 'eventturk' | 'platform';
};

type CacheEntry = {
  items: CalendarEvent[];
  fetchedAt: number;
};

const EVENTTURK_API = 'https://eventturk.de/wp-json/eventturk/v1/events';
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; TurkExpatlar/1.0; +https://turkexpatlar.de)',
  Accept: 'application/json',
};

type EventTurkEvent = {
  id: number;
  title: string;
  excerpt?: string;
  permalink: string;
  start: string;
  end?: string | null;
  image?: { medium?: string; large?: string; full?: string } | null;
  venue?: {
    name?: string;
    address?: string;
    location?: { city?: { name?: string }; state?: { name?: string } };
  } | null;
  location?: { city?: { name?: string }; state?: { name?: string } };
  artists?: { name: string }[];
  categories?: { name: string; slug: string }[];
  ticketing?: {
    mode?: string;
    links?: { provider?: string; price?: string; url?: string }[];
  };
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
  }): Promise<{
    items: CalendarEvent[];
    total: number;
    cities: string[];
    categories: string[];
  }> {
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
        e.categories.some(
          (c) => c.toLowerCase() === cat || e.category?.toLowerCase() === cat,
        ),
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

    const [eventturk, platform] = await Promise.allSettled([
      this.fetchEventTurkEvents(),
      this.fetchPlatformEvents(),
    ]);

    const items = [
      ...(eventturk.status === 'fulfilled' ? eventturk.value : []),
      ...(platform.status === 'fulfilled' ? platform.value : []),
    ];

    items.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    this.cache = { items, fetchedAt: Date.now() };
    return items;
  }

  private async fetchEventTurkEvents(): Promise<CalendarEvent[]> {
    const all: CalendarEvent[] = [];
    const dateFrom = new Date().toISOString().slice(0, 10);
    let page = 1;

    while (page <= 10) {
      try {
        const url = `${EVENTTURK_API}?per_page=50&page=${page}&date_from=${dateFrom}&status=scheduled&orderby=start_asc`;
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) break;

        const data = (await res.json()) as {
          items?: EventTurkEvent[];
          total_pages?: number;
        };
        const events = data.items ?? [];
        if (!events.length) break;

        for (const ev of events) {
          const mapped = this.mapEventTurkEvent(ev);
          if (mapped) all.push(mapped);
        }

        if (!data.total_pages || page >= data.total_pages) break;
        page++;
      } catch (err) {
        this.logger.warn(
          `EventTurk fetch page ${page}: ${(err as Error).message}`,
        );
        break;
      }
    }

    this.logger.log(`EventTurk: ${all.length} etkinlik yüklendi`);
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
      cost:
        ev.priceType === 'FREE'
          ? 'Ücretsiz'
          : ev.priceAmount
            ? `${ev.priceAmount}€`
            : undefined,
      costValue: ev.priceAmount ?? undefined,
      category: 'Topluluk',
      categories: ['Topluluk'],
      imageUrl: undefined,
      ticketUrl: undefined,
      detailUrl: `/etkinlikler/${ev.id}`,
      source: 'platform' as const,
    }));
  }

  private mapEventTurkEvent(ev: EventTurkEvent): CalendarEvent | null {
    if (!ev.start || !ev.title) return null;

    const cityName = ev.venue?.location?.city?.name ?? ev.location?.city?.name;
    const city = normalizeCityName(cityName) || 'Almanya';
    const categories = (ev.categories ?? []).map((c) => c.name);
    const category = categories[0];
    const artist = ev.artists?.[0]?.name;
    const imageUrl = ev.image?.large ?? ev.image?.medium ?? ev.image?.full;

    const firstLink = ev.ticketing?.links?.[0];
    const cost = firstLink?.price ? `${firstLink.price}€` : undefined;
    const costValue = firstLink?.price
      ? parseFloat(firstLink.price.replace('.', '').replace(',', '.'))
      : undefined;

    return {
      id: `eventturk-${ev.id}`,
      title: this.decodeHtml(ev.title),
      startDate: ev.start,
      endDate: ev.end ?? undefined,
      city,
      venue: ev.venue?.name,
      address: ev.venue?.address,
      cost,
      costValue,
      category,
      categories,
      imageUrl,
      ticketUrl: firstLink?.url,
      detailUrl: ev.permalink,
      artist: artist ? this.decodeHtml(artist) : undefined,
      source: 'eventturk',
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
