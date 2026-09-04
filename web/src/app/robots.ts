import type { MetadataRoute } from "next";
import { fetchPublicSiteSettings } from "@/lib/site-settings";
import { getSiteUrl, normalizeSiteUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await fetchPublicSiteSettings();
  const siteUrl = settings.canonicalUrl?.trim()
    ? normalizeSiteUrl(settings.canonicalUrl)
    : getSiteUrl();

  if (!settings.robotsAllowIndex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/profil",
          "/ayarlar",
          "/hosgeldin",
          "/kayit",
          "/giris",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
