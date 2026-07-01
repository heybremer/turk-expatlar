/** Eyalet adı → ISO 3166-2 kodu */
export const STATE_CODES: Record<string, string> = {
  'Baden-Württemberg': 'BW',
  Bayern: 'BY',
  Berlin: 'BE',
  Brandenburg: 'BB',
  Bremen: 'HB',
  Hamburg: 'HH',
  Hessen: 'HE',
  'Mecklenburg-Vorpommern': 'MV',
  Niedersachsen: 'NI',
  'Nordrhein-Westfalen': 'NW',
  'Rheinland-Pfalz': 'RP',
  Saarland: 'SL',
  Sachsen: 'SN',
  'Sachsen-Anhalt': 'ST',
  'Schleswig-Holstein': 'SH',
  Thüringen: 'TH',
};

export const ALL_STATES = Object.keys(STATE_CODES);

/** Almanca tatil adı → Türkçe karşılık */
export const HOLIDAY_TR: Record<string, string> = {
  Neujahr: 'Yılbaşı',
  'Heilige Drei Könige': 'Üç Kral Günü (Epifani)',
  'Internationaler Frauentag': 'Kadınlar Günü',
  Karfreitag: 'Kara Cuma',
  Ostersonntag: 'Paskalya Pazar',
  Ostermontag: 'Paskalya Pazartesi',
  'Tag der Arbeit': 'Emek ve Dayanışma Günü',
  'Christi Himmelfahrt': 'Göğe Yükseliş (Himmelfahrt)',
  Pfingstsonntag: 'Pentikost Pazar',
  Pfingstmontag: 'Pentikost Pazartesi',
  Fronleichnam: 'Corpus Christi (Kutsal Cuma)',
  'Tag der Deutschen Einheit': 'Alman Birliği Günü',
  Weltkindertag: 'Dünya Çocuk Günü',
  'Internationaler Kindertag': 'Uluslararası Çocuk Günü',
  'Welttag der Kinderrechte': 'BM Çocuk Hakları Günü',
  '23 Nisan — Ulusal Egemenlik ve Çocuk Bayramı': '23 Nisan — Çocuk Bayramı',
  Nikolaustag: 'Aziz Nikolaus Günü (Nikolaus)',
  Reformationstag: 'Reformasyon Günü',
  Allerheiligen: 'Tüm Azizler Günü',
  'Buß- und Bettag': 'Tövbe ve Dua Günü',
  '1. Weihnachtstag': 'Noel (1. Gün)',
  '2. Weihnachtstag': 'Noel (2. Gün)',
  '1. Weihnachtsfeiertag': 'Noel (1. Gün)',
  '2. Weihnachtsfeiertag': 'Noel (2. Gün)',
  Weihnachtstag: 'Noel',
  'Maria Himmelfahrt': "Meryem Ana'nın Göğe Kabulü",
};

export function toTurkish(nameDe: string): string {
  return HOLIDAY_TR[nameDe] ?? nameDe;
}

/** Paskalya Pazar günü (Gregoryen) */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sachsen: Buß- und Bettag */
function bussUndBettag(year: number): Date {
  const christmas = new Date(year, 11, 24);
  const daysFromSunday = christmas.getDay();
  const advent4 = addDays(christmas, -daysFromSunday - 21);
  const totensonntag = addDays(advent4, -7);
  return addDays(totensonntag, -4);
}

const HEILIGE_DREI_KOENIGE = new Set([
  'Baden-Württemberg',
  'Bayern',
  'Sachsen-Anhalt',
]);

const FRONLEICHNAM_EXCLUDED = new Set([
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Schleswig-Holstein',
]);

const REFORMATIONSTAG = new Set([
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
]);

const ALLERHEILIGEN = new Set([
  'Baden-Württemberg',
  'Bayern',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
]);

export type HolidayEntry = {
  date: string;
  nameDe: string;
  nameTr: string;
  nationwide: boolean;
  /** Resmi Feiertag — işyerleri / okullar genelde kapalı */
  isPublicHoliday: boolean;
  /** Çocuklarla ilgili gün */
  childrenRelated: boolean;
  noteTr?: string;
};

function getOfficialHolidays(stateName: string, year: number): HolidayEntry[] {
  const easter = easterSunday(year);
  const items: HolidayEntry[] = [];

  const add = (
    date: Date,
    nameDe: string,
    nationwide: boolean,
    childrenRelated = false,
    noteTr?: string,
  ) => {
    items.push({
      date: formatIso(date),
      nameDe,
      nameTr: toTurkish(nameDe),
      nationwide,
      isPublicHoliday: true,
      childrenRelated,
      noteTr,
    });
  };

  add(new Date(year, 0, 1), 'Neujahr', true);
  add(addDays(easter, -2), 'Karfreitag', true);
  add(addDays(easter, 1), 'Ostermontag', true);
  add(new Date(year, 4, 1), 'Tag der Arbeit', true);
  add(addDays(easter, 39), 'Christi Himmelfahrt', true);
  add(addDays(easter, 50), 'Pfingstmontag', true);
  add(new Date(year, 9, 3), 'Tag der Deutschen Einheit', true);
  add(new Date(year, 11, 25), '1. Weihnachtstag', true);
  add(new Date(year, 11, 26), '2. Weihnachtstag', true);

  if (HEILIGE_DREI_KOENIGE.has(stateName)) {
    add(new Date(year, 0, 6), 'Heilige Drei Könige', false);
  }
  if (stateName === 'Berlin') {
    add(new Date(year, 2, 8), 'Internationaler Frauentag', false);
  }
  if (!FRONLEICHNAM_EXCLUDED.has(stateName)) {
    add(addDays(easter, 60), 'Fronleichnam', false);
  }
  if (stateName === 'Thüringen') {
    add(
      new Date(year, 8, 20),
      'Weltkindertag',
      false,
      true,
      'Thüringen eyaletinde resmi tatildir.',
    );
  }
  if (REFORMATIONSTAG.has(stateName)) {
    add(new Date(year, 9, 31), 'Reformationstag', false);
  }
  if (ALLERHEILIGEN.has(stateName)) {
    add(new Date(year, 10, 1), 'Allerheiligen', false);
  }
  if (stateName === 'Saarland' || stateName === 'Bayern') {
    add(
      new Date(year, 7, 15),
      'Maria Himmelfahrt',
      false,
      false,
      'Katolik bölgelerde resmi tatildir.',
    );
  }
  if (stateName === 'Sachsen') {
    add(bussUndBettag(year), 'Buß- und Bettag', false);
  }

  return items;
}

/** Resmi tatil olmayan; çocuklarla ilgili önemli günler */
function getChildrenObservanceDays(
  stateName: string,
  year: number,
): HolidayEntry[] {
  const items: HolidayEntry[] = [];

  const add = (
    date: Date,
    nameDe: string,
    noteTr: string,
    nationwide = true,
  ) => {
    items.push({
      date: formatIso(date),
      nameDe,
      nameTr: toTurkish(nameDe),
      nationwide,
      isPublicHoliday: false,
      childrenRelated: true,
      noteTr,
    });
  };

  add(
    new Date(year, 5, 1),
    'Internationaler Kindertag',
    'Eski Doğu Almanya geleneği; birçok okul ve belediyede çocuk etkinlikleri düzenlenir.',
  );

  if (stateName !== 'Thüringen') {
    add(
      new Date(year, 8, 20),
      'Weltkindertag',
      'Thüringen dışında resmi tatil değildir; etkinlikler ve farkındalık günü olarak kutlanır.',
    );
  }

  add(
    new Date(year, 10, 20),
    'Welttag der Kinderrechte',
    'Birleşmiş Milletler Çocuk Hakları Günü; okullarda etkinlikler yapılır.',
  );

  add(
    new Date(year, 3, 23),
    '23 Nisan — Ulusal Egemenlik ve Çocuk Bayramı',
    'Türkiye Cumhuriyeti\'nin çocuk bayramı; Almanya\'daki Türk okul ve derneklerinde kutlanır.',
  );

  add(
    new Date(year, 11, 6),
    'Nikolaustag',
    'Almanya\'da çocuklara St. Nikolaus gecesi hediye ve şeker geleneği.',
  );

  return items;
}

export function getHolidaysForState(
  stateName: string,
  year: number,
): HolidayEntry[] {
  const official = getOfficialHolidays(stateName, year);
  const officialKeys = new Set(official.map((h) => `${h.date}:${h.nameDe}`));

  const childrenDays = getChildrenObservanceDays(stateName, year).filter(
    (h) => !officialKeys.has(`${h.date}:${h.nameDe}`),
  );

  const merged = [...official, ...childrenDays];
  merged.sort((a, b) => a.date.localeCompare(b.date));
  return merged;
}

export function getNationalHolidays(year: number): HolidayEntry[] {
  return getHolidaysForState('Berlin', year).filter((h) => h.isPublicHoliday && h.nationwide);
}
