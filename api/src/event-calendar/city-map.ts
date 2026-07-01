/** Vasistdas şehir adlarını filtre için normalize eder */
export const FEATURED_CITIES = [
  'Berlin',
  'Düsseldorf',
  'Köln',
  'Frankfurt',
  'Hamburg',
  'München',
  'Stuttgart',
] as const;

const BERLIN_DISTRICTS = [
  'mitte',
  'friedrichshain-kreuzberg',
  'pankow',
  'charlottenburg-wilmersdorf',
  'spandau',
  'steglitz-zehlendorf',
  'tempelhof-schöneberg',
  'tempelhof-schoeneberg',
  'neukölln',
  'neukoelln',
  'treptow-köpenick',
  'treptow-koepenick',
  'marzahn-hellersdorf',
  'lichtenberg',
  'reinickendorf',
];

const HAMBURG_DISTRICTS = [
  'altona',
  'bergedorf',
  'eimsbüttel',
  'eimsbuettel',
  'harburg',
  'hamburg-mitte',
  'hamburg-nord',
  'wandsbek',
];

const CITY_ALIASES: Record<string, string[]> = {
  Berlin: ['berlin', ...BERLIN_DISTRICTS],
  Düsseldorf: ['düsseldorf', 'dusseldorf', 'duesseldorf'],
  Köln: ['köln', 'koln', 'koeln', 'cologne', 'bonn'],
  Frankfurt: ['frankfurt', 'frankfurt am main', 'offenbach am main', 'offenbach', 'wiesbaden', 'darmstadt'],
  Hamburg: ['hamburg', ...HAMBURG_DISTRICTS],
  München: ['münchen', 'muenchen', 'munich', 'münih', 'munih', 'augsburg', 'ingolstadt'],
  Stuttgart: ['stuttgart', 'stuttgart-wangen', 'esslingen', 'esslingen am neckar', 'ludwigsburg'],
  Dortmund: ['dortmund', 'bochum', 'wuppertal', 'hagen', 'hamm'],
  Bochum: ['bochum'],
  Dresden: ['dresden', 'leipzig', 'chemnitz'],
  Duisburg: ['duisburg', 'oberhausen', 'mülheim an der ruhr', 'mulheim an der ruhr'],
  Karlsruhe: ['karlsruhe', 'mannheim', 'heidelberg'],
  Nürnberg: ['nürnberg', 'nurnberg', 'nuernberg', 'fürth', 'fuerth', 'erlangen'],
  Hildesheim: ['hildesheim', 'hannover', 'braunschweig'],
  Bremen: ['bremen', 'bremerhaven'],
  Bielefeld: ['bielefeld', 'paderborn', 'münster', 'muenster'],
  Mannheim: ['mannheim'],
};

export function normalizeCityName(raw?: string | null): string {
  if (!raw?.trim()) return '';
  const lower = raw.trim().toLowerCase();

  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((a) => lower === a || lower.includes(a))) {
      return canonical;
    }
  }

  return raw.trim();
}

export function isFeaturedCity(city?: string | null): boolean {
  const normalized = normalizeCityName(city);
  return (FEATURED_CITIES as readonly string[]).includes(normalized);
}

export function cityMatchesFilter(eventCity: string, filterCity?: string): boolean {
  if (!filterCity?.trim() || filterCity.trim() === 'Almanya') return true;
  return normalizeCityName(eventCity) === normalizeCityName(filterCity);
}
