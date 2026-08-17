const PRODUCTION_SITE_URL = "https://www.turkexpatlar.de";
const DEV_SITE_URL = "http://localhost:3200";

export type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  SITE_URL?: string;
  NODE_ENV?: string;
};

/** Trailing slash kaldırır; sitemap/robots path birleştirmesi için. */
export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Ortam değişkenlerinden site kök URL'sini çözer.
 * Öncelik: NEXT_PUBLIC_SITE_URL → SITE_URL → production varsayılanı → localhost (dev).
 */
export function resolveSiteUrl(env: SiteUrlEnv): string {
  const fromEnv = env.NEXT_PUBLIC_SITE_URL ?? env.SITE_URL;
  if (fromEnv?.trim()) {
    return normalizeSiteUrl(fromEnv);
  }
  if (env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }
  return DEV_SITE_URL;
}

/** Çalışma zamanında kullanılacak site kök URL'si. */
export function getSiteUrl(): string {
  return resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SITE_URL: process.env.SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
