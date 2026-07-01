import type { PostalCountry } from "./postal-country";

export const RESTRICTABLE_PAGES = [
  { key: "/akis", label: "Akış" },
  { key: "/forum", label: "Forum" },
  { key: "/sohbet", label: "Sohbet" },
  { key: "/etkinlikler", label: "Etkinlikler" },
  { key: "/rehber", label: "Rehber" },
  { key: "/isler", label: "İş İlanları" },
  { key: "/seyahat", label: "Seyahat" },
  { key: "/uygulamalar", label: "Uygulamalar" },
  { key: "/isletmeler", label: "İşletmeler" },
  { key: "/sehirler", label: "Şehirler" },
  { key: "/haberler", label: "Haberler" },
] as const;

export type RestrictablePageKey = (typeof RESTRICTABLE_PAGES)[number]["key"];

const ALWAYS_ALLOWED_PREFIXES = [
  "/profil",
  "/destek",
  "/hosgeldin",
  "/gizlilik",
  "/kullanim",
  "/forum/kurallar",
  "/kullanici",
];

const ALWAYS_ALLOWED_EXACT = ["/", "/giris", "/kayit"];

export function isAlwaysAllowedPath(pathname: string): boolean {
  if (ALWAYS_ALLOWED_EXACT.includes(pathname)) return true;
  return ALWAYS_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function matchesPagePrefix(pathname: string, pageKey: string): boolean {
  return pathname === pageKey || pathname.startsWith(`${pageKey}/`);
}

export function canAccessPage(params: {
  pathname: string;
  postalCountry?: PostalCountry | null;
  role?: string | null;
  allowedPages: string[];
}): boolean {
  const { pathname, postalCountry, role, allowedPages } = params;
  if (postalCountry !== "TR") return true;
  if (role === "ADMIN" || role === "MODERATOR") return true;
  if (isAlwaysAllowedPath(pathname)) return true;
  return allowedPages.some((page) => matchesPagePrefix(pathname, page));
}

export function navLinkAllowed(
  href: string,
  postalCountry?: PostalCountry | null,
  role?: string | null,
  allowedPages: string[] = [],
): boolean {
  if (postalCountry !== "TR") return true;
  if (role === "ADMIN" || role === "MODERATOR") return true;
  return canAccessPage({ pathname: href, postalCountry, role, allowedPages });
}
