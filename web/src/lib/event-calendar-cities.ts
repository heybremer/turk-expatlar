/** Frontend şehir filtresi — API city-map ile uyumlu */
export const FEATURED_CITIES = [
  "Almanya",
  "Berlin",
  "Düsseldorf",
  "Köln",
  "Frankfurt",
  "Hamburg",
  "München",
  "Stuttgart",
] as const;

const BERLIN_DISTRICTS = [
  "mitte",
  "friedrichshain-kreuzberg",
  "pankow",
  "charlottenburg-wilmersdorf",
  "spandau",
  "steglitz-zehlendorf",
  "tempelhof-schöneberg",
  "tempelhof-schoeneberg",
  "neukölln",
  "neukoelln",
  "treptow-köpenick",
  "treptow-koepenick",
  "marzahn-hellersdorf",
  "lichtenberg",
  "reinickendorf",
];

const HAMBURG_DISTRICTS = [
  "altona",
  "bergedorf",
  "eimsbüttel",
  "eimsbuettel",
  "harburg",
  "hamburg-mitte",
  "hamburg-nord",
  "wandsbek",
];

const CITY_ALIASES: Record<string, string[]> = {
  Berlin: ["berlin", ...BERLIN_DISTRICTS],
  Düsseldorf: ["düsseldorf", "dusseldorf", "duesseldorf"],
  Köln: ["köln", "koln", "koeln", "cologne", "bonn"],
  Frankfurt: ["frankfurt", "frankfurt am main", "offenbach am main", "offenbach", "wiesbaden", "darmstadt"],
  Hamburg: ["hamburg", ...HAMBURG_DISTRICTS],
  München: ["münchen", "muenchen", "munich", "münih", "munih", "augsburg", "ingolstadt"],
  Stuttgart: ["stuttgart", "stuttgart-wangen", "esslingen", "esslingen am neckar", "ludwigsburg"],
};

export function normalizeEventCity(raw?: string | null): string {
  if (!raw?.trim()) return "";
  const lower = raw.trim().toLowerCase();

  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((a) => lower === a || lower.includes(a))) {
      return canonical;
    }
  }

  return raw.trim();
}

/** Profil şehrinden güvenli filtre şehri — yalnızca öne çıkan şehirler */
export function profileCityToFilter(profileCity?: string | null): string {
  const normalized = normalizeEventCity(profileCity);
  if (!normalized) return "Almanya";
  const featured = FEATURED_CITIES.slice(1);
  if ((featured as readonly string[]).includes(normalized)) return normalized;
  return "Almanya";
}
