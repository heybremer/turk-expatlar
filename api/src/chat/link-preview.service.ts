import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 500_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const BLOCKED_HOSTNAMES = ['localhost', '0.0.0.0', '127.0.0.1', '::1'];

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);
  private cache = new Map<string, { data: LinkPreview; expiresAt: number }>();

  async getPreview(rawUrl: string): Promise<LinkPreview> {
    const url = this.validateUrl(rawUrl);

    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const html = await this.fetchHtml(url);
    const data: LinkPreview = {
      url,
      title: this.extractMeta(html, 'og:title') ?? this.extractTitleTag(html),
      description:
        this.extractMeta(html, 'og:description') ??
        this.extractMeta(html, 'description'),
      image: this.resolveUrl(this.extractMeta(html, 'og:image'), url),
      siteName: this.extractMeta(html, 'og:site_name'),
    };

    this.cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  private validateUrl(rawUrl: string): string {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Geçersiz URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Yalnızca http/https desteklenir');
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      BLOCKED_HOSTNAMES.includes(hostname) ||
      hostname.endsWith('.local') ||
      /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)
    ) {
      throw new BadRequestException('Bu adres desteklenmiyor');
    }
    return parsed.toString();
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      // Yönlendirmeler elle takip edilir: her hedef URL yeniden doğrulanır
      // (SSRF koruması — dış URL'nin iç ağa yönlendirmesi engellenir).
      let currentUrl = url;
      let res: Response | undefined;
      for (let hop = 0; hop < 5; hop++) {
        res = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; TurkExpatlarBot/1.0; +https://turkexpatlar.de)',
            Accept: 'text/html',
          },
        });
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location) throw new BadRequestException('Sayfa yüklenemedi');
          currentUrl = this.validateUrl(
            new URL(location, currentUrl).toString(),
          );
          continue;
        }
        break;
      }
      if (!res || !res.ok) throw new BadRequestException('Sayfa yüklenemedi');
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html'))
        throw new BadRequestException(
          'Önizleme yalnızca web sayfaları için desteklenir',
        );

      const reader = res.body?.getReader();
      if (!reader) return await res.text();

      let received = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.length;
          chunks.push(value);
          if (received > MAX_BYTES) {
            void reader.cancel();
            break;
          }
        }
      }
      return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.debug(
        `Link preview fetch failed for ${url}: ${err instanceof Error ? err.message : err}`,
      );
      throw new BadRequestException('Önizleme alınamadı');
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractMeta(html: string, property: string): string | undefined {
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
        'i',
      ),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return this.decodeEntities(match[1]).trim();
    }
    return undefined;
  }

  private extractTitleTag(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match?.[1] ? this.decodeEntities(match[1]).trim() : undefined;
  }

  private resolveUrl(
    maybeUrl: string | undefined,
    baseUrl: string,
  ): string | undefined {
    if (!maybeUrl) return undefined;
    try {
      return new URL(maybeUrl, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
}
