import type { PublicSiteSettings } from "@/lib/site-settings";

/** Admin panelden açılıp kapatılabilen /uygulamalar modülleri */
export type AppFeatureKey =
  | "appStateNewsEnabled"
  | "appCityNewsEnabled"
  | "appEventCalendarEnabled"
  | "appPublicHolidaysEnabled"
  | "appConsulatesEnabled"
  | "appOfficialInstitutionsEnabled"
  | "appTravelGuideEnabled";

export const APP_FEATURE_LABELS: Record<
  AppFeatureKey,
  { title: string; description: string; adminLabel: string }
> = {
  appStateNewsEnabled: {
    adminLabel: "Eyalet Haberleri",
    title: "Eyalet Haberleri kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
  appCityNewsEnabled: {
    adminLabel: "Şehir Haberleri",
    title: "Şehir Haberleri kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
  appEventCalendarEnabled: {
    adminLabel: "Etkinlik Takvimi",
    title: "Etkinlik Takvimi kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
  appPublicHolidaysEnabled: {
    adminLabel: "Tatil Günleri",
    title: "Tatil Günleri kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
  appConsulatesEnabled: {
    adminLabel: "Türk Konsoloslukları",
    title: "Türk Konsoloslukları kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
  appOfficialInstitutionsEnabled: {
    adminLabel: "Almanya Resmi Kurumlar",
    title: "Resmi Kurumlar kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
  appTravelGuideEnabled: {
    adminLabel: "Gezgin Rehberi",
    title: "Gezgin Rehberi kapalı",
    description: "Bu uygulama geçici olarak devre dışı bırakıldı.",
  },
};

export const APP_FEATURE_KEYS = Object.keys(APP_FEATURE_LABELS) as AppFeatureKey[];

/** /uygulamalar alt sayfa yolu → ayar anahtarı */
export const UYGULAMA_ROUTE_FEATURES: Record<string, AppFeatureKey> = {
  "/uygulamalar/eyalet-haberleri": "appStateNewsEnabled",
  "/uygulamalar/sehir-haberleri": "appCityNewsEnabled",
  "/uygulamalar/etkinlik-takvimi": "appEventCalendarEnabled",
  "/uygulamalar/tatil-gunleri": "appPublicHolidaysEnabled",
  "/uygulamalar/konsolosluklar": "appConsulatesEnabled",
  "/uygulamalar/resmi-kurumlar": "appOfficialInstitutionsEnabled",
  "/uygulamalar/gezgin-rehberi": "appTravelGuideEnabled",
};

export function isAppRouteEnabled(
  settings: PublicSiteSettings,
  href: string,
): boolean {
  const feature = UYGULAMA_ROUTE_FEATURES[href];
  if (!feature) return true;
  return isAppFeatureEnabled(settings, feature);
}

export function isAppFeatureEnabled(
  settings: PublicSiteSettings,
  feature: AppFeatureKey,
): boolean {
  return settings[feature] !== false;
}
