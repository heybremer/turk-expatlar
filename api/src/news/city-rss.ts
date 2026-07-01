import type { FeedSource } from './state-rss';

export type CityFeedSource = FeedSource & {
  kind: 'municipal' | 'regional';
};

/** Profildeki şehir adı varyasyonlarını eşleştir */
export const CITY_ALIASES: Record<string, string> = {
  Frankfurt: 'Frankfurt am Main',
  Ludwigshafen: 'Ludwigshafen am Rhein',
  Halle: 'Halle (Saale)',
  Koeln: 'Köln',
  Muenchen: 'München',
  Nuernberg: 'Nürnberg',
  Duesseldorf: 'Düsseldorf',
};

export function normalizeCityName(name: string): string {
  const trimmed = name.trim();
  return CITY_ALIASES[trimmed] ?? trimmed;
}

/**
 * Belediye (Stadt) ve yerel medya RSS kaynakları.
 * Kaynak yoksa backend Google News fallback kullanır.
 */
export const CITY_RSS: Record<string, CityFeedSource[]> = {
  Berlin: [
    {
      url: 'https://www.berlin.de/aktuelles/pressemitteilungen/index/feed/rss',
      source: 'Berlin.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.rbb24.de/feed/rss-berlin.xml',
      source: 'rbb24 Berlin',
      kind: 'regional',
    },
  ],
  München: [
    {
      url: 'https://www.muenchen.de/aktuell/feed/rss',
      source: 'muenchen.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.br.de/nachrichten/muenchen/index~rss.xml',
      source: 'BR24 München',
      kind: 'regional',
    },
  ],
  Hamburg: [
    {
      url: 'https://www.hamburg.de/presse/rss.xml',
      source: 'hamburg.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.ndr.de/nachrichten/hamburg/index-rss.xml',
      source: 'NDR Hamburg',
      kind: 'regional',
    },
  ],
  Köln: [
    {
      url: 'https://www.stadt-koeln.de/service/rss.xml',
      source: 'Stadt Köln',
      kind: 'municipal',
    },
    {
      url: 'https://www1.wdr.de/nachrichten/koeln-bonn/index~rss.xml',
      source: 'WDR Köln',
      kind: 'regional',
    },
  ],
  'Frankfurt am Main': [
    {
      url: 'https://frankfurt.de/service-de/rss',
      source: 'Frankfurt.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.hessenschau.de/nachrichten/rss.xml',
      source: 'hessenschau',
      kind: 'regional',
    },
  ],
  Stuttgart: [
    {
      url: 'https://www.stuttgart.de/presse/rss',
      source: 'Stuttgart.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.swr.de/home/nachrichten/nachrichten-bw/rss/feed=7802.xml',
      source: 'SWR BW',
      kind: 'regional',
    },
  ],
  Düsseldorf: [
    {
      url: 'https://www.duesseldorf.de/medien/rss',
      source: 'Düsseldorf.de',
      kind: 'municipal',
    },
    {
      url: 'https://www1.wdr.de/nachrichten/duesseldorf/index~rss.xml',
      source: 'WDR Düsseldorf',
      kind: 'regional',
    },
  ],
  Dortmund: [
    {
      url: 'https://www.dortmund.de/de/leben_in_dortmund/nachrichten/rss/',
      source: 'Dortmund.de',
      kind: 'municipal',
    },
    {
      url: 'https://www1.wdr.de/nachrichten/ruhrgebiet/dortmund/index~rss.xml',
      source: 'WDR Dortmund',
      kind: 'regional',
    },
  ],
  Essen: [
    {
      url: 'https://www.essen.de/service/rss/index_2,1024,de.html',
      source: 'Essen.de',
      kind: 'municipal',
    },
    {
      url: 'https://www1.wdr.de/nachrichten/ruhrgebiet/essen/index~rss.xml',
      source: 'WDR Essen',
      kind: 'regional',
    },
  ],
  Leipzig: [
    {
      url: 'https://www.leipzig.de/news/rss/',
      source: 'Leipzig.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.mdr.de/nachrichten/sachsen/leipzig/rss/leipzig100.xml',
      source: 'MDR Leipzig',
      kind: 'regional',
    },
  ],
  Dresden: [
    {
      url: 'https://www.dresden.de/de/leben/stadtportrait/stadtinformation/presse/presseservice_rss.php',
      source: 'Dresden.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.mdr.de/nachrichten/sachsen/dresden/rss/dresden100.xml',
      source: 'MDR Dresden',
      kind: 'regional',
    },
  ],
  Hannover: [
    {
      url: 'https://www.hannover.de/Leben-in-der-Region-Hannover/Politik-Verwaltung-Stadt/LHH-Nachrichten/Nachrichtenarchiv/RSS-Nachrichten-Feed',
      source: 'Hannover.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.ndr.de/nachrichten/niedersachsen/hannover/index-rss.xml',
      source: 'NDR Hannover',
      kind: 'regional',
    },
  ],
  Nürnberg: [
    {
      url: 'https://www.nuernberg.de/internet/portal_rss/portal_rss.xml',
      source: 'Nürnberg.de',
      kind: 'municipal',
    },
    {
      url: 'https://www.br.de/nachrichten/nuernberg/index~rss.xml',
      source: 'BR24 Nürnberg',
      kind: 'regional',
    },
  ],
  Bonn: [
    {
      url: 'https://www.bonn.de/presse/rss.php',
      source: 'Bonn.de',
      kind: 'municipal',
    },
    {
      url: 'https://www1.wdr.de/nachrichten/koeln-bonn/index~rss.xml',
      source: 'WDR Bonn',
      kind: 'regional',
    },
  ],
  Bremen: [
    {
      url: 'https://www.butenunbinnen.de/feed/rss.xml',
      source: 'buten un binnen',
      kind: 'regional',
    },
    {
      url: 'https://www.bremen.de/service/rss',
      source: 'Bremen.de',
      kind: 'municipal',
    },
  ],
  Mannheim: [
    {
      url: 'https://www.mannheim.de/de/service-und-rathaus/aktuelles/pressemitteilungen/rss',
      source: 'Mannheim.de',
      kind: 'municipal',
    },
  ],
  Karlsruhe: [
    {
      url: 'https://www.karlsruhe.de/b1/stadt/presse/rss',
      source: 'Karlsruhe.de',
      kind: 'municipal',
    },
  ],
  Augsburg: [
    {
      url: 'https://www.augsburg.de/buergerservice-rathaus/aktuelles/pressemitteilungen/rss',
      source: 'Augsburg.de',
      kind: 'municipal',
    },
  ],
  Wiesbaden: [
    {
      url: 'https://www.wiesbaden.de/microsite/aktuelles/presse/rss.php',
      source: 'Wiesbaden.de',
      kind: 'municipal',
    },
  ],
  Münster: [
    {
      url: 'https://www.stadt-muenster.de/aktuelles/presse/rss',
      source: 'Münster.de',
      kind: 'municipal',
    },
  ],
  Aachen: [
    {
      url: 'https://www.aachen.de/DE/stadt_buerger/aktuelles/pressemitteilungen/_functions/rssfeed/index.html',
      source: 'Aachen.de',
      kind: 'municipal',
    },
  ],
  Bielefeld: [
    {
      url: 'https://www.bielefeld.de/de/rathaus/presse/pressemitteilungen/rss.xml',
      source: 'Bielefeld.de',
      kind: 'municipal',
    },
  ],
  Bochum: [
    {
      url: 'https://www.bochum.de/City-Info/Presse/Pressemitteilungen.htm/rss',
      source: 'Bochum.de',
      kind: 'municipal',
    },
  ],
  Duisburg: [
    {
      url: 'https://www.duisburg.de/microsite/aktuelles/presse/rss.php',
      source: 'Duisburg.de',
      kind: 'municipal',
    },
  ],
  Wuppertal: [
    {
      url: 'https://www.wuppertal.de/microsite/aktuelles/presse/rss.php',
      source: 'Wuppertal.de',
      kind: 'municipal',
    },
  ],
  'Freiburg im Breisgau': [
    {
      url: 'https://www.freiburg.de/pb/,Lde/Startseite/Aktuelles/Pressemitteilungen.htm/rss',
      source: 'Freiburg.de',
      kind: 'municipal',
    },
  ],
  Freiburg: [
    {
      url: 'https://www.freiburg.de/pb/,Lde/Startseite/Aktuelles/Pressemitteilungen.htm/rss',
      source: 'Freiburg.de',
      kind: 'municipal',
    },
  ],
  Heidelberg: [
    {
      url: 'https://www.heidelberg.de/hd/HD/Leben/aktuelles/presse/pressemitteilungen.html/rss',
      source: 'Heidelberg.de',
      kind: 'municipal',
    },
  ],
  Mainz: [
    {
      url: 'https://www.mainz.de/service/rss/pressemitteilungen.xml',
      source: 'Mainz.de',
      kind: 'municipal',
    },
  ],
  Koblenz: [
    {
      url: 'https://www.koblenz.de/pb/,Lde/Startseite/Aktuelles/Pressemitteilungen.htm/rss',
      source: 'Koblenz.de',
      kind: 'municipal',
    },
  ],
  Saarbrücken: [
    {
      url: 'https://www.saarbruecken.de/pb/,Lde/Startseite/Aktuelles/Pressemitteilungen.htm/rss',
      source: 'Saarbrücken.de',
      kind: 'municipal',
    },
  ],
  Rostock: [
    {
      url: 'https://www.rostock.de/aktuelles/pressemitteilungen/rss.xml',
      source: 'Rostock.de',
      kind: 'municipal',
    },
  ],
  Kiel: [
    {
      url: 'https://www.kiel.de/de/politik_verwaltung/presse/pressemitteilungen/rss.php',
      source: 'Kiel.de',
      kind: 'municipal',
    },
  ],
  Erfurt: [
    {
      url: 'https://www.erfurt.de/ef/de/stadtverwaltung/presse/pressemitteilungen/rss.xml',
      source: 'Erfurt.de',
      kind: 'municipal',
    },
  ],
  Magdeburg: [
    {
      url: 'https://www.magdeburg.de/start/presse/pressemitteilungen/rss.xml',
      source: 'Magdeburg.de',
      kind: 'municipal',
    },
  ],
};

export function googleNewsCityUrl(cityName: string, stateName?: string): string {
  const q = stateName
    ? `${cityName} ${stateName} Stadt OR ${cityName} Kommune`
    : `${cityName} Stadt OR ${cityName} Kommune`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=de&gl=DE&ceid=DE:de`;
}

export function getAvailableCities(): string[] {
  return Object.keys(CITY_RSS);
}
