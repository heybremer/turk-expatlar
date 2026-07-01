import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "d MMM yyyy", { locale: tr });
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return formatDistanceToNow(date, { addSuffix: true, locale: tr });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "d MMM yyyy HH:mm", { locale: tr });
  } catch {
    return dateStr;
  }
}

export const COUNTRY_FLAG: Record<string, string> = {
  DE: "🇩🇪",
  TR: "🇹🇷",
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export const CDN_URL = "https://api.turkexpatlar.de";

export function avatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${CDN_URL}${url}`;
}

const STATE_SLUGS: Record<string, string> = {
  "Baden-Württemberg": "baden-wuerttemberg", Bayern: "bayern", Berlin: "berlin",
  Brandenburg: "brandenburg", Bremen: "bremen", Hamburg: "hamburg",
  Hessen: "hessen", "Mecklenburg-Vorpommern": "mecklenburg-vorpommern",
  Niedersachsen: "niedersachsen", "Nordrhein-Westfalen": "nordrhein-westfalen",
  "Rheinland-Pfalz": "rheinland-pfalz", Saarland: "saarland",
  Sachsen: "sachsen", "Sachsen-Anhalt": "sachsen-anhalt",
  "Schleswig-Holstein": "schleswig-holstein", Thüringen: "thueringen",
};

/** Eyalet/şehir adını backend'deki slug alanıyla eşleşecek şekilde normalize eder. */
export function toSlug(name: string): string {
  return (
    STATE_SLUGS[name] ??
    name
      .toLowerCase()
      .replace(/ü/g, "ue")
      .replace(/ö/g, "oe")
      .replace(/ä/g, "ae")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

/** Bir metindeki ilk http(s) bağlantısını döndürür (link önizlemesi için). */
export function extractFirstUrl(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  if (!match) return null;
  return match[0].replace(/[).,!?;:'"]+$/, "");
}

export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]+/g, " ");
}
