import { PostalCountry, UserRole } from '@prisma/client';

export const RESTRICTABLE_PAGES = [
  { key: '/akis', label: 'Akış' },
  { key: '/forum', label: 'Forum' },
  { key: '/sohbet', label: 'Sohbet' },
  { key: '/etkinlikler', label: 'Etkinlikler' },
  { key: '/rehber', label: 'Rehber' },
  { key: '/isler', label: 'İş İlanları' },
  { key: '/seyahat', label: 'Seyahat' },
  { key: '/uygulamalar', label: 'Uygulamalar' },
  { key: '/isletmeler', label: 'İşletmeler' },
  { key: '/sehirler', label: 'Şehirler' },
  { key: '/haberler', label: 'Haberler' },
] as const;

export type RestrictablePageKey = (typeof RESTRICTABLE_PAGES)[number]['key'];

export const DEFAULT_TR_ALLOWED_PAGES: string[] = [
  '/seyahat',
  '/profil',
  '/destek',
  '/hosgeldin',
];

/** TR kullanıcıları için her zaman erişilebilir sayfalar */
const ALWAYS_ALLOWED_PREFIXES = [
  '/profil',
  '/destek',
  '/hosgeldin',
  '/gizlilik',
  '/kullanim',
  '/forum/kurallar',
  '/kullanici',
];

const ALWAYS_ALLOWED_EXACT = ['/', '/giris', '/kayit'];

export function isAlwaysAllowedPath(pathname: string): boolean {
  if (ALWAYS_ALLOWED_EXACT.includes(pathname)) return true;
  return ALWAYS_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function matchesPagePrefix(pathname: string, pageKey: string): boolean {
  return pathname === pageKey || pathname.startsWith(`${pageKey}/`);
}

export function resolveAllowedPages(
  userAllowedPages: string[],
  siteDefaultPages: string[],
): string[] {
  if (userAllowedPages.length > 0) return userAllowedPages;
  return siteDefaultPages.length > 0 ? siteDefaultPages : [...DEFAULT_TR_ALLOWED_PAGES];
}

export function canAccessPage(params: {
  pathname: string;
  postalCountry?: PostalCountry | null;
  role?: UserRole | string | null;
  allowedPages: string[];
}): boolean {
  const { pathname, postalCountry, role, allowedPages } = params;

  if (postalCountry !== PostalCountry.TR) return true;
  if (role === UserRole.ADMIN || role === UserRole.MODERATOR) return true;
  if (isAlwaysAllowedPath(pathname)) return true;

  return allowedPages.some((page) => matchesPagePrefix(pathname, page));
}

export function sanitizePageKeys(pages: string[]): string[] {
  const valid = new Set(RESTRICTABLE_PAGES.map((p) => p.key));
  return [...new Set(pages.filter((p) => valid.has(p as RestrictablePageKey)))];
}
