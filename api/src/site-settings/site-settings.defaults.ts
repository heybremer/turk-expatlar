export const DEFAULT_SITE_SETTINGS = {
  siteName: 'Türk Expatlar',
  siteTagline: 'Almanya Türkçe Topluluk Platformu',
  metaTitle: 'Türk Expatlar — Almanya Türkçe Topluluk Platformu',
  metaDescription:
    "Almanya'daki Türkçe konuşanlar için şehir bazlı topluluk, etkinlik, soru-cevap ve güvenilir işletme rehberi.",
  maintenanceMessage:
    'Sitemiz kısa süreli bakımda. Lütfen biraz sonra tekrar deneyin.',
  footerTagline:
    "Almanya'daki Türkçe konuşanlar için güvenilir topluluk platformu.",
  footerCopyrightText: 'Türk Expatlar. Tüm hakları saklıdır.',
  launchBadgeText: 'Lansman — Son {remaining} kişi ücretsiz',
  launchHeadline: 'Yıllık sadece {price} € — ya da davet kodunla ücretsiz',
  launchDescription:
    'Kullanıcı üyeliği: {userPrice} €/yıl · İşletme üyeliği: {businessPrice} €/yıl · {promoCode} kodu ile kalan {remaining} ücretsiz üyelik hakkı.',
  launchPromoCode: 'LAUNCH100',
  userMembershipPriceEur: 10,
  businessMembershipPriceEur: 50,
  cacheTtlMinutes: 60,
  robotsAllowIndex: true,
  maintenanceMode: false,
  maintenanceAllowAdmins: true,
  cacheEnabled: true,
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
  trDefaultAllowedPages: ['/seyahat', '/profil', '/destek', '/hosgeldin'] as string[],
} as const;

export type PublicSiteSettings = {
  siteName: string;
  siteTagline: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  robotsAllowIndex: boolean;
  customHeadHtml: string | null;
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
};

export function isMaintenanceActive(settings: {
  maintenanceMode: boolean;
  maintenanceStartAt?: Date | string | null;
  maintenanceEndAt?: Date | string | null;
}): boolean {
  if (!settings.maintenanceMode) return false;
  const now = Date.now();
  if (settings.maintenanceStartAt) {
    const start = new Date(settings.maintenanceStartAt).getTime();
    if (now < start) return false;
  }
  if (settings.maintenanceEndAt) {
    const end = new Date(settings.maintenanceEndAt).getTime();
    if (now > end) return false;
  }
  return true;
}
