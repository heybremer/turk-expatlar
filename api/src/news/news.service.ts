import { Injectable, Logger } from '@nestjs/common';
import {
  CITY_RSS,
  googleNewsCityUrl,
  normalizeCityName,
  type CityFeedSource,
} from './city-rss';
import { STATE_RSS } from './state-rss';
import { getCacheConfig } from '../site-settings/runtime-config.store';

export type NewsItem = {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
  kind?: 'municipal' | 'regional' | 'local';
};

type CacheEntry = {
  items: NewsItem[];
  fetchedAt: number;
};

const CACHE_VERSION = 'v3';
const TAGESSCHAU_RSS = 'https://www.tagesschau.de/xml/rss2';
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml, application/xml, text/xml, */*',
};

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private cache = new Map<string, CacheEntry>();
  private imageCache = new Map<string, string>();

  clearCache() {
    this.cache.clear();
    this.imageCache.clear();
    this.logger.log('News feed cache cleared');
  }

  private isCacheValid(fetchedAt: number): boolean {
    const { cacheEnabled, cacheTtlMs } = getCacheConfig();
    if (!cacheEnabled) return false;
    return Date.now() - fetchedAt < cacheTtlMs;
  }

  async getStateNews(stateName: string): Promise<NewsItem[]> {
    const feed = STATE_RSS[stateName];
    if (!feed) return [];

    const cacheKey = `${CACHE_VERSION}:state:${stateName}`;
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.fetchedAt)) {
      return cached.items;
    }

    const feedTasks: Promise<NewsItem[]>[] = [];
    if (feed) {
      feedTasks.push(this.fetchFeed(feed.url, feed.source, 'regional'));
    }
    feedTasks.push(
      this.fetchFeed(TAGESSCHAU_RSS, 'tagesschau', 'regional'),
    );

    const results = await Promise.allSettled(feedTasks);
    let merged = this.mergeItems(results);
    merged = await this.enrichMissingImages(merged);
    merged = this.sortWithImagesFirst(merged);

    this.cache.set(cacheKey, { items: merged, fetchedAt: Date.now() });
    return merged;
  }

  async getCityNews(
    cityName: string,
    stateName?: string,
  ): Promise<NewsItem[]> {
    const normalized = normalizeCityName(cityName);
    if (!normalized) return [];

    const cacheKey = `${CACHE_VERSION}:city:${normalized}:${stateName ?? ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.fetchedAt)) {
      return cached.items;
    }

    const feeds: CityFeedSource[] = CITY_RSS[normalized] ?? [];
    const feedTasks: Promise<NewsItem[]>[] = feeds.map((f) =>
      this.fetchFeed(f.url, f.source, f.kind),
    );

    feedTasks.push(
      this.fetchFeed(TAGESSCHAU_RSS, 'tagesschau', 'regional'),
    );

    feedTasks.push(
      this.fetchFeed(
        googleNewsCityUrl(normalized, stateName),
        `${normalized} Haberleri`,
        'local',
      ),
    );

    const results = await Promise.allSettled(feedTasks);
    let merged = this.mergeItems(results);
    merged = await this.enrichMissingImages(merged);
    merged = this.sortWithImagesFirst(merged);

    this.cache.set(cacheKey, { items: merged, fetchedAt: Date.now() });
    return merged;
  }

  getAvailableStates(): string[] {
    return Object.keys(STATE_RSS);
  }

  getAvailableCities(): string[] {
    return Object.keys(CITY_RSS);
  }

  private async fetchFeed(
    url: string,
    source: string,
    kind: NewsItem['kind'] = 'local',
  ): Promise<NewsItem[]> {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<item')) {
        throw new Error('Not RSS');
      }
      return this.parseRss(xml, source, kind);
    } catch (err) {
      this.logger.warn(
        `RSS fetch failed (${source}): ${(err as Error).message}`,
      );
      return [];
    }
  }

  private mergeItems(
    results: PromiseSettledResult<NewsItem[]>[],
  ): NewsItem[] {
    const seen = new Set<string>();
    const all: NewsItem[] = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const item of result.value) {
        const key = item.link.replace(/\/$/, '').toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(item);
      }
    }

    all.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    return all.slice(0, 20);
  }

  /** Görselli haberleri öne al */
  private sortWithImagesFirst(items: NewsItem[]): NewsItem[] {
    return [...items].sort((a, b) => {
      const aHas = a.imageUrl && this.isValidImageUrl(a.imageUrl) ? 1 : 0;
      const bHas = b.imageUrl && this.isValidImageUrl(b.imageUrl) ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });
  }

  /** Haber sayfasından og:image çekerek eksik görselleri tamamla */
  private async enrichMissingImages(items: NewsItem[]): Promise<NewsItem[]> {
    const needsImage = items.filter(
      (i) => !i.imageUrl || !this.isValidImageUrl(i.imageUrl),
    );

    const batch = needsImage.slice(0, 8);
    const CONCURRENCY = 4;

    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        chunk.map(async (item) => {
          const cached = this.imageCache.get(item.link);
          if (cached) {
            item.imageUrl = cached;
            return;
          }
          if (item.link.includes('news.google.com')) return;
          const img = await this.fetchPageImage(item.link);
          if (img) {
            this.imageCache.set(item.link, img);
            item.imageUrl = img;
          }
        }),
      );
    }

    return items.map((item) => {
      if (item.imageUrl && this.isValidImageUrl(item.imageUrl)) return item;
      const cached = this.imageCache.get(item.link);
      return cached ? { ...item, imageUrl: cached } : item;
    });
  }

  private async fetchPageImage(url: string): Promise<string | undefined> {
    try {
      const res = await fetch(url, {
        headers: {
          ...FETCH_HEADERS,
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(4000),
        redirect: 'follow',
      });
      if (!res.ok) return undefined;
      const reader = res.body?.getReader();
      if (!reader) return undefined;

      let html = '';
      const decoder = new TextDecoder();
      while (html.length < 80_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (html.includes('</head>')) break;
      }
      reader.cancel().catch(() => undefined);

      const img = this.extractMetaImage(html);
      return img && this.isValidImageUrl(img) ? img : undefined;
    } catch {
      return undefined;
    }
  }

  private extractMetaImage(html: string): string | undefined {
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    ];

    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return this.decodeUrl(m[1]);
    }
    return undefined;
  }

  private parseRss(
    xml: string,
    source: string,
    kind: NewsItem['kind'] = 'local',
  ): NewsItem[] {
    const items: NewsItem[] = [];
    const itemMatches = xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi);

    for (const match of itemMatches) {
      const block = match[1];

      const title = this.extractCdata(block, 'title') ?? '';
      const link =
        this.extractCdata(block, 'link') ??
        this.extractTag(block, 'link') ??
        this.extractAttr(block, 'link', 'href') ??
        '';
      const rawDesc =
        this.extractCdata(block, 'content:encoded') ??
        this.extractCdata(block, 'description') ??
        this.extractCdata(block, 'summary') ??
        '';
      const pubDate =
        this.extractTag(block, 'pubDate') ??
        this.extractTag(block, 'updated') ??
        '';
      const imageUrl = this.extractImageUrl(block, rawDesc);

      if (!title || !link) continue;

      items.push({
        title: this.clean(title),
        summary: this.stripHtml(this.clean(rawDesc)).slice(0, 400),
        link: link.trim(),
        pubDate,
        source,
        imageUrl,
        kind,
      });

      if (items.length >= 15) break;
    }

    return items;
  }

  private extractImageUrl(block: string, html: string): string | undefined {
    const candidates: string[] = [];

    const mediaUrls = block.matchAll(
      /<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/gi,
    );
    for (const m of mediaUrls) candidates.push(m[1]);

    const enclosure = block.match(
      /<enclosure[^>]+url=["']([^"']+)["'][^>]*(?:type=["']image[^"']*["'])?/i,
    );
    if (enclosure) candidates.push(enclosure[1]);

    const imgFromHtml = this.extractImgFromHtml(html);
    if (imgFromHtml) candidates.push(imgFromHtml);

    for (const raw of candidates) {
      const url = this.decodeUrl(raw);
      if (this.isValidImageUrl(url)) return url;
    }
    return undefined;
  }

  private extractImgFromHtml(html: string): string | undefined {
    if (!html) return undefined;

    const imgs = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const m of imgs) {
      let url = this.decodeUrl(m[1]);
      if (url.includes('images.tagesschau.de') && url.includes('width=1920')) {
        url = url.replace('width=1920', 'width=640');
      }
      if (this.isValidImageUrl(url)) return url;
    }

    const srcset = html.match(/srcset=["']([^"']+)["']/i);
    if (srcset) {
      const parts = srcset[1].split(',').map((p) => p.trim().split(/\s+/)[0]);
      for (let i = parts.length - 1; i >= 0; i--) {
        const url = this.decodeUrl(parts[i]);
        if (this.isValidImageUrl(url)) return url;
      }
    }

    return undefined;
  }

  private isValidImageUrl(url?: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (!lower.startsWith('http')) return false;
    if (lower.startsWith('data:')) return false;
    if (lower.includes('.svg')) return false;
    if (lower.includes('logo') && lower.includes('brand')) return false;
    if (lower.includes('1x1') || lower.includes('pixel.gif')) return false;
    if (lower.includes('placeholder') || lower.includes('spacer')) return false;
    return true;
  }

  private decodeUrl(url: string): string {
    return this.clean(url.replace(/&amp;/g, '&'));
  }

  private extractCdata(block: string, tag: string): string | null {
    const re = new RegExp(
      `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))`,
      'i',
    );
    const m = block.match(re);
    return m ? (m[1] ?? m[2] ?? null) : null;
  }

  private extractTag(block: string, tag: string): string | null {
    const re = new RegExp(`<${tag}[^>]*>([^<]*)`, 'i');
    const m = block.match(re);
    return m ? m[1].trim() || null : null;
  }

  private extractAttr(
    block: string,
    tag: string,
    attr: string,
  ): string | null {
    const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i');
    const m = block.match(re);
    return m ? m[1] : null;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private clean(s: string): string {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}
