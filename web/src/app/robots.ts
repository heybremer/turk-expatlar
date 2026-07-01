import type { MetadataRoute } from "next";
import { fetchPublicSiteSettings } from "@/lib/site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await fetchPublicSiteSettings();

  if (!settings.robotsAllowIndex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/profil/",
          "/ayarlar/",
          "/hosgeldin",
          "/kayit",
          "/giris",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
