export type FeedSource = {
  url: string;
  source: string;
};

export const STATE_RSS: Record<string, FeedSource> = {
  'Baden-Württemberg': {
    url: 'https://www.swr.de/home/nachrichten/nachrichten-bw/rss/feed=7802.xml',
    source: 'SWR',
  },
  Bayern: {
    url: 'https://www.br.de/nachrichten/rss/nachrichten.rss',
    source: 'BR24',
  },
  Berlin: {
    url: 'https://www.rbb24.de/feed/rss-berlin.xml',
    source: 'rbb24',
  },
  Brandenburg: {
    url: 'https://www.rbb24.de/feed/rss-brandenburg.xml',
    source: 'rbb24',
  },
  Bremen: {
    url: 'https://www.butenunbinnen.de/feed/rss.xml',
    source: 'buten un binnen',
  },
  Hamburg: {
    url: 'https://www.ndr.de/nachrichten/hamburg/index-rss.xml',
    source: 'NDR Hamburg',
  },
  Hessen: {
    url: 'https://www.hessenschau.de/nachrichten/rss.xml',
    source: 'hessenschau',
  },
  'Mecklenburg-Vorpommern': {
    url: 'https://www.ndr.de/nachrichten/mecklenburg-vorpommern/index-rss.xml',
    source: 'NDR MV',
  },
  Niedersachsen: {
    url: 'https://www.ndr.de/nachrichten/niedersachsen/index-rss.xml',
    source: 'NDR Niedersachsen',
  },
  'Nordrhein-Westfalen': {
    url: 'https://www1.wdr.de/nachrichten/feed/wdr-nachrichten-rss.xml',
    source: 'WDR',
  },
  'Rheinland-Pfalz': {
    url: 'https://www.swr.de/home/nachrichten/nachrichten-rlp/rss/feed=7824.xml',
    source: 'SWR RP',
  },
  Saarland: {
    url: 'https://www.sr.de/sr/nachrichten/nachrichten_1906~rss_article.xml',
    source: 'SR',
  },
  Sachsen: {
    url: 'https://www.mdr.de/nachrichten/sachsen/rss/nachrichten-sachsen100.xml',
    source: 'MDR Sachsen',
  },
  'Sachsen-Anhalt': {
    url: 'https://www.mdr.de/nachrichten/sachsen-anhalt/rss/nachrichten-sachsen-anhalt100.xml',
    source: 'MDR Sachsen-Anhalt',
  },
  'Schleswig-Holstein': {
    url: 'https://www.ndr.de/nachrichten/schleswig-holstein/index-rss.xml',
    source: 'NDR SH',
  },
  Thüringen: {
    url: 'https://www.mdr.de/nachrichten/thueringen/rss/nachrichten-thueringen100.xml',
    source: 'MDR Thüringen',
  },
};
