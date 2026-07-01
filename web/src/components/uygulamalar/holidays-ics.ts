export type Holiday = {
  date: string;
  nameDe: string;
  nameTr: string;
  nationwide: boolean;
  isPublicHoliday: boolean;
  childrenRelated: boolean;
  noteTr?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function nextDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function holidaysToIcs(
  holidays: Holiday[],
  state: string,
  year: number,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Turk Expatlar//Tatil Gunleri//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`${state} Resmi Tatiller ${year}`)}`,
  ];

  for (const h of holidays) {
    const start = h.date.replace(/-/g, "");
    const uid = `${h.date}-${h.nameDe.replace(/\W+/g, "-").toLowerCase()}-${state.replace(/\W+/g, "-")}@turkexpatlar.de`;
    const desc = [
      h.nameDe,
      h.nationwide ? "Tüm Almanya" : state,
      h.isPublicHoliday ? "Resmi tatil" : "Anma / etkinlik günü",
      h.noteTr,
    ]
      .filter(Boolean)
      .join(" — ");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${nextDate(h.date)}`,
      `SUMMARY:${icsEscape(h.nameTr)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function getHolidaysFeedUrl(
  state: string,
  year: number,
  options?: { subscribe?: boolean },
): string {
  const params = new URLSearchParams({
    state,
    year: String(year),
  });
  const httpsUrl = `${API_URL}/api/public-holidays/feed.ics?${params}`;
  if (options?.subscribe) {
    return httpsUrl.replace(/^https?:/, "webcal:");
  }
  return httpsUrl;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Mobilde takvim uygulamasını doğrudan açar; masaüstünde .ics indirir */
export function addHolidaysToCalendar(
  holidays: Holiday[],
  state: string,
  year: number,
): void {
  if (isMobileDevice()) {
    // iOS: webcal → Takvim'e abonelik, tüm tatiller otomatik eklenir
    // Android: .ics URL → Google Takvim / varsayılan takvim açılır
    const url = getHolidaysFeedUrl(state, year, { subscribe: isIosDevice() });
    window.location.assign(url);
    return;
  }

  downloadHolidaysIcs(holidays, state, year);
}

export function downloadHolidaysIcs(
  holidays: Holiday[],
  state: string,
  year: number,
): void {
  const content = holidaysToIcs(holidays, state, year);
  const slug = state
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\W+/g, "-");
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tatil-gunleri-${slug}-${year}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
