import { cache } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

export type SiteSettings = {
  id: string;
  siteName: string;
  siteTagline: string | null;
  contactEmail: string | null;
  supportEmail: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  robotsAllowIndex: boolean;
  customHeadHtml: string | null;
  googleAnalyticsId: string | null;
  googleTagManagerId: string | null;
  googleAdsId: string | null;
  googleAdsConversionLabel: string | null;
  googleSearchConsoleVerification: string | null;
  facebookPixelId: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  maintenanceAllowAdmins: boolean;
  maintenanceStartAt: string | null;
  maintenanceEndAt: string | null;
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  cacheClearedAt: string | null;
  registrationEnabled: boolean;
  forumEnabled: boolean;
  chatEnabled: boolean;
  eventsEnabled: boolean;
  appStateNewsEnabled: boolean;
  appCityNewsEnabled: boolean;
  appEventCalendarEnabled: boolean;
  appPublicHolidaysEnabled: boolean;
  appConsulatesEnabled: boolean;
  appOfficialInstitutionsEnabled: boolean;
  appTravelGuideEnabled: boolean;
  trDefaultAllowedPages: string[];
  logoUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  telegramUrl: string | null;
  whatsappNumber: string | null;
  footerTagline: string | null;
  footerCopyrightText: string | null;
  launchBadgeText: string | null;
  launchHeadline: string | null;
  launchDescription: string | null;
  launchPromoCode: string | null;
  userMembershipPriceEur: number;
  businessMembershipPriceEur: number;
  updatedAt: string;
};

export type PublicSiteSettings = Pick<
  SiteSettings,
  | "siteName"
  | "siteTagline"
  | "metaTitle"
  | "metaDescription"
  | "metaKeywords"
  | "ogImageUrl"
  | "canonicalUrl"
  | "robotsAllowIndex"
  | "customHeadHtml"
  | "logoUrl"
  | "instagramUrl"
  | "facebookUrl"
  | "telegramUrl"
  | "whatsappNumber"
  | "footerTagline"
  | "footerCopyrightText"
  | "launchBadgeText"
  | "launchHeadline"
  | "launchDescription"
  | "launchPromoCode"
  | "userMembershipPriceEur"
  | "businessMembershipPriceEur"
  | "googleAnalyticsId"
  | "googleTagManagerId"
  | "googleAdsId"
  | "googleAdsConversionLabel"
  | "googleSearchConsoleVerification"
  | "facebookPixelId"
  | "maintenanceMode"
  | "maintenanceMessage"
  | "maintenanceAllowAdmins"
  | "maintenanceStartAt"
  | "maintenanceEndAt"
  | "registrationEnabled"
  | "forumEnabled"
  | "chatEnabled"
  | "eventsEnabled"
  | "trDefaultAllowedPages"
  | "appStateNewsEnabled"
  | "appCityNewsEnabled"
  | "appEventCalendarEnabled"
  | "appPublicHolidaysEnabled"
  | "appConsulatesEnabled"
  | "appOfficialInstitutionsEnabled"
  | "appTravelGuideEnabled"
>;

const FALLBACK_PUBLIC: PublicSiteSettings = {
  siteName: "Türk Expatlar",
  siteTagline: "Almanya Türkçe Topluluk Platformu",
  metaTitle: "Türk Expatlar — Almanya Türkçe Topluluk Platformu",
  metaDescription:
    "Almanya'daki Türkçe konuşanlar için şehir bazlı topluluk, etkinlik, soru-cevap ve güvenilir işletme rehberi.",
  metaKeywords: null,
  ogImageUrl: null,
  canonicalUrl: null,
  robotsAllowIndex: true,
  customHeadHtml: null,
  logoUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  telegramUrl: null,
  whatsappNumber: null,
  footerTagline:
    "Almanya'daki Türkçe konuşanlar için güvenilir topluluk platformu.",
  footerCopyrightText: "Türk Expatlar. Tüm hakları saklıdır.",
  launchBadgeText: "Lansman — Son {remaining} kişi ücretsiz",
  launchHeadline: "Yıllık sadece {price} € — ya da davet kodunla ücretsiz",
  launchDescription:
    "Kullanıcı üyeliği: {userPrice} €/yıl · İşletme üyeliği: {businessPrice} €/yıl · {promoCode} kodu ile kalan {remaining} ücretsiz üyelik hakkı.",
  launchPromoCode: "LAUNCH100",
  userMembershipPriceEur: 10,
  businessMembershipPriceEur: 50,
  googleAnalyticsId: null,
  googleTagManagerId: null,
  googleAdsId: null,
  googleAdsConversionLabel: null,
  googleSearchConsoleVerification: null,
  facebookPixelId: null,
  maintenanceMode: false,
  maintenanceMessage: null,
  maintenanceAllowAdmins: true,
  maintenanceStartAt: null,
  maintenanceEndAt: null,
  registrationEnabled: true,
  forumEnabled: true,
  chatEnabled: true,
  eventsEnabled: true,
  appStateNewsEnabled: true,
  appCityNewsEnabled: true,
  appEventCalendarEnabled: true,
  appPublicHolidaysEnabled: true,
  appConsulatesEnabled: true,
  appOfficialInstitutionsEnabled: true,
  appTravelGuideEnabled: true,
  trDefaultAllowedPages: ["/seyahat", "/profil", "/destek", "/hosgeldin"],
};

// React.cache() ile aynı request içinde tekrarlı çağrılar deduplicate edilir
async function fetchPublicSettingsFromApi(
  cacheMode: RequestCache,
  revalidate?: number,
): Promise<PublicSiteSettings> {
  try {
    const res = await fetch(`${API_URL}/api/site-settings/public`, {
      cache: cacheMode,
      ...(revalidate !== undefined ? { next: { revalidate } } : {}),
    });
    if (!res.ok) return FALLBACK_PUBLIC;
    const data = (await res.json()) as Partial<PublicSiteSettings>;
    return { ...FALLBACK_PUBLIC, ...data };
  } catch {
    return FALLBACK_PUBLIC;
  }
}

export const fetchPublicSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  return fetchPublicSettingsFromApi("force-cache", 120);
});

/** Özellik anahtarları — admin değişiklikleri anında yansısın */
export async function fetchPublicSiteSettingsLive(): Promise<PublicSiteSettings> {
  return fetchPublicSettingsFromApi("no-store");
}

export type SiteSettingsForm = {
  siteName: string;
  siteTagline: string;
  contactEmail: string;
  supportEmail: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImageUrl: string;
  canonicalUrl: string;
  robotsAllowIndex: boolean;
  customHeadHtml: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  googleSearchConsoleVerification: string;
  facebookPixelId: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceAllowAdmins: boolean;
  maintenanceStartAt: string;
  maintenanceEndAt: string;
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  registrationEnabled: boolean;
  forumEnabled: boolean;
  chatEnabled: boolean;
  eventsEnabled: boolean;
  appStateNewsEnabled: boolean;
  appCityNewsEnabled: boolean;
  appEventCalendarEnabled: boolean;
  appPublicHolidaysEnabled: boolean;
  appConsulatesEnabled: boolean;
  appOfficialInstitutionsEnabled: boolean;
  appTravelGuideEnabled: boolean;
  logoUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  telegramUrl: string;
  whatsappNumber: string;
  footerTagline: string;
  footerCopyrightText: string;
  launchBadgeText: string;
  launchHeadline: string;
  launchDescription: string;
  launchPromoCode: string;
  userMembershipPriceEur: number;
  businessMembershipPriceEur: number;
};

export const EMPTY_SITE_SETTINGS: SiteSettingsForm = {
  siteName: "Türk Expatlar",
  siteTagline: "",
  contactEmail: "",
  supportEmail: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImageUrl: "",
  canonicalUrl: "",
  robotsAllowIndex: true,
  customHeadHtml: "",
  googleAnalyticsId: "",
  googleTagManagerId: "",
  googleAdsId: "",
  googleAdsConversionLabel: "",
  googleSearchConsoleVerification: "",
  facebookPixelId: "",
  maintenanceMode: false,
  maintenanceMessage: "",
  maintenanceAllowAdmins: true,
  maintenanceStartAt: "",
  maintenanceEndAt: "",
  cacheEnabled: true,
  cacheTtlMinutes: 60,
  registrationEnabled: true,
  forumEnabled: true,
  chatEnabled: true,
  eventsEnabled: true,
  appStateNewsEnabled: true,
  appCityNewsEnabled: true,
  appEventCalendarEnabled: true,
  appPublicHolidaysEnabled: true,
  appConsulatesEnabled: true,
  appOfficialInstitutionsEnabled: true,
  appTravelGuideEnabled: true,
  logoUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  telegramUrl: "",
  whatsappNumber: "",
  footerTagline: "",
  footerCopyrightText: "",
  launchBadgeText: "",
  launchHeadline: "",
  launchDescription: "",
  launchPromoCode: "LAUNCH100",
  userMembershipPriceEur: 10,
  businessMembershipPriceEur: 50,
};

export function interpolateLaunchText(
  template: string | null | undefined,
  vars: Record<string, string | number>,
): string {
  if (!template?.trim()) return "";
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? `{${key}}`),
  );
}
