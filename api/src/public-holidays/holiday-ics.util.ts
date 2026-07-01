import type { HolidayEntry } from './holiday-rules';

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function nextDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function holidaysToIcs(
  holidays: HolidayEntry[],
  state: string,
  year: number,
): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z/, 'Z');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Turk Expatlar//Tatil Gunleri//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(`${state} Tatiller ${year}`)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    'REFRESH-INTERVAL;VALUE=DURATION:P7D',
    `DTSTAMP:${now}`,
  ];

  for (const h of holidays) {
    const start = h.date.replace(/-/g, '');
    const uid = `${h.date}-${h.nameDe.replace(/\W+/g, '-').toLowerCase()}-${state.replace(/\W+/g, '-')}@turkexpatlar.de`;
    const desc = [
      h.nameDe,
      h.nationwide ? 'Tüm Almanya' : state,
      h.isPublicHoliday ? 'Resmi tatil' : 'Anma / etkinlik günü',
      h.noteTr,
    ]
      .filter(Boolean)
      .join(' — ');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${nextDate(h.date)}`,
      `SUMMARY:${icsEscape(h.nameTr)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
