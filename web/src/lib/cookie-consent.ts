"use client";

export type CookieCategory = "essential" | "analytics" | "functional" | "marketing";

export type CookieConsent = {
  given: boolean;
  timestamp: number;
  categories: Record<CookieCategory, boolean>;
};

const STORAGE_KEY = "cookie_consent";

export const COOKIE_CATEGORIES: {
  id: CookieCategory;
  label: string;
  description: string;
  required: boolean;
}[] = [
  {
    id: "essential",
    label: "Zorunlu Çerezler",
    description:
      "Sitenin çalışması için gereken temel çerezler. Giriş durumu, güvenlik ve oturum yönetimi için kullanılır. Devre dışı bırakılamaz.",
    required: true,
  },
  {
    id: "functional",
    label: "İşlevsel Çerezler",
    description:
      "Dil tercihi, tema (açık/koyu mod) ve diğer kişiselleştirme ayarlarınızı hatırlamak için kullanılır.",
    required: false,
  },
  {
    id: "analytics",
    label: "Analitik Çerezler",
    description:
      "Ziyaretçi sayısı ve sayfa görüntüleme istatistikleri gibi anonim kullanım verilerini toplar. Siteyi iyileştirmemize yardımcı olur.",
    required: false,
  },
  {
    id: "marketing",
    label: "Pazarlama Çerezleri",
    description:
      "İlgi alanlarınıza göre kişiselleştirilmiş içerik ve reklamlar göstermek için kullanılır.",
    required: false,
  },
];

export function getConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(categories: Record<CookieCategory, boolean>): void {
  const consent: CookieConsent = {
    given: true,
    timestamp: Date.now(),
    categories,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
}

export function acceptAll(): void {
  saveConsent({ essential: true, functional: true, analytics: true, marketing: true });
}

export function rejectAll(): void {
  saveConsent({ essential: true, functional: false, analytics: false, marketing: false });
}

export function hasConsent(category: CookieCategory): boolean {
  const c = getConsent();
  if (!c) return false;
  return c.categories[category] ?? false;
}

export function clearConsent(): void {
  localStorage.removeItem(STORAGE_KEY);
}
