"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Baby,
  Calendar,
  CalendarPlus,
  ChevronRight,
  Flag,
  Loader2,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";
import { addHolidaysToCalendar, isMobileDevice, type Holiday } from "./holidays-ics";

export type { Holiday };

type HolidaysResponse = {
  state: string;
  year: number;
  holidays: Holiday[];
  total: number;
  officialCount: number;
  childrenCount: number;
};

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function formatDateTr(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T12:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isPast(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso + "T12:00:00") < today;
}

function isToday(iso: string) {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today;
}

function HolidayCard({
  h,
  state,
  compact = false,
}: {
  h: Holiday;
  state: string;
  compact?: boolean;
}) {
  const d = new Date(h.date + "T12:00:00");
  const past = isPast(h.date);
  const today = isToday(h.date);
  const until = daysUntil(h.date);

  return (
    <article
      className={`flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3.5 ${
        today
          ? "border-primary bg-primary/5"
          : past
            ? "border-border bg-surface/50 opacity-60"
            : "border-border bg-surface"
      } ${compact ? "py-3" : ""}`}
    >
      <div
        className={`flex flex-shrink-0 flex-col items-center justify-center rounded-lg bg-background text-center ${
          compact ? "h-12 w-12" : "h-14 w-14"
        }`}
      >
        <span className="text-[10px] font-medium uppercase text-muted">
          {WEEKDAYS[d.getDay()].slice(0, 3)}
        </span>
        <span className={`font-bold leading-none ${compact ? "text-lg" : "text-xl"}`}>
          {d.getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-text ${compact ? "text-sm" : ""}`}>{h.nameTr}</p>
        {!compact && <p className="text-sm text-muted">{h.nameDe}</p>}
        {h.noteTr && !compact && (
          <p className="mt-1 text-xs leading-relaxed text-muted">{h.noteTr}</p>
        )}
        <p className="mt-0.5 text-xs text-muted">
          {compact ? formatShortDate(h.date) : formatDateTr(h.date)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!past && !today && until > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {until} gün
          </span>
        )}
        {h.isPublicHoliday && (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold text-success">
            Resmi tatil
          </span>
        )}
        {!h.isPublicHoliday && (
          <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[10px] font-semibold text-warning">
            Anma günü
          </span>
        )}
        {h.childrenRelated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-pink-600 dark:text-pink-400">
            <Baby className="h-3 w-3" />
            Çocuk
          </span>
        )}
        {h.isPublicHoliday && h.nationwide && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
            <Flag className="h-3 w-3" />
            Tüm Almanya
          </span>
        )}
        {h.isPublicHoliday && !h.nationwide && (
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
            {state} özel
          </span>
        )}
        {today && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-white">
            Bugün
          </span>
        )}
      </div>
    </article>
  );
}

export function PublicHolidaysPage() {
  const { token, isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  const [states, setStates] = useState<string[]>([]);
  const [state, setState] = useState("Nordrhein-Westfalen");
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<HolidaysResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [icsAdded, setIcsAdded] = useState(false);

  useEffect(() => {
    api
      .get<string[]>("/public-holidays/states")
      .then(setStates)
      .catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || !token) return;
    api
      .get<{ profile?: { state?: { name: string } | null } }>("/users/me", token)
      .then((user) => {
        const profileState = user.profile?.state?.name;
        if (profileState) setState(profileState);
      })
      .catch(() => undefined);
  }, [token, isAuthenticated]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<HolidaysResponse>(
        `/public-holidays?state=${encodeURIComponent(state)}&year=${year}`,
      );
      setData(res);
    } catch {
      setError("Tatil günleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [state, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const upcomingChildren = useMemo(
    () =>
      (data?.holidays ?? []).filter((h) => h.childrenRelated && !isPast(h.date)),
    [data?.holidays],
  );

  const officialGrouped = useMemo(() => {
    const map = new Map<number, Holiday[]>();
    for (const h of data?.holidays ?? []) {
      if (!h.isPublicHoliday) continue;
      const month = parseInt(h.date.slice(5, 7), 10) - 1;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(h);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [data?.holidays]);

  const childrenGrouped = useMemo(() => {
    const map = new Map<number, Holiday[]>();
    for (const h of data?.holidays ?? []) {
      if (h.isPublicHoliday) continue;
      if (!h.childrenRelated) continue;
      const month = parseInt(h.date.slice(5, 7), 10) - 1;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(h);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [data?.holidays]);

  const upcoming = useMemo(
    () => (data?.holidays ?? []).filter((h) => !isPast(h.date)),
    [data?.holidays],
  );

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  function handleAddToCalendar() {
    if (!data?.holidays.length) return;
    addHolidaysToCalendar(data.holidays, state, year);
    setIcsAdded(true);
    setTimeout(() => setIcsAdded(false), 4000);
  }

  const calendarButtonLabel = icsAdded
    ? isMobileDevice()
      ? "Takvim açılıyor…"
      : "Takvime eklendi!"
    : isMobileDevice()
      ? "Telefon takvimine ekle"
      : "Takvime ekle (.ics)";

  return (
    <PageContainer>
      <Link
        href="/uygulamalar"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Uygulamalar
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tatil Günleri</h1>
            <p className="text-sm text-muted">
              Resmi tatiller ve çocuklarla ilgili önemli günler — eyalete göre
            </p>
          </div>
        </div>

        {!loading && data && data.holidays.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToCalendar}
            className="shrink-0"
          >
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            {calendarButtonLabel}
          </Button>
        )}
      </div>

      {/* Eyalet + yıl seçimi */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            <MapPin className="mr-1 inline h-3.5 w-3.5" />
            Eyalet (Bundesland)
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="mb-1.5 block text-xs font-medium text-muted">Yıl</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loading && data && (
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {data.officialCount} resmi tatil
          </span>
          <span className="rounded-full bg-pink-500/10 px-3 py-1 text-sm font-medium text-pink-600 dark:text-pink-400">
            {data.childrenCount} çocuk günü
          </span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            {upcoming.length} yaklaşan
          </span>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Yaklaşan tatiller — üstte */}
          {upcoming.length > 0 && (
            <section className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-text">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  Yaklaşan Tatiller
                </h2>
                <span className="text-xs text-muted">{upcoming.length} tatil</span>
              </div>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((h) => (
                  <HolidayCard key={h.date + h.nameDe} h={h} state={state} compact />
                ))}
              </div>
              {upcoming.length > 5 && (
                <p className="mt-3 text-center text-xs text-muted">
                  +{upcoming.length - 5} tatil daha aşağıda listeleniyor
                </p>
              )}
            </section>
          )}

          {upcoming.length === 0 && data && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
              {year < currentYear
                ? "Bu yıl için yaklaşan tatil kalmadı."
                : "Bu yıl için yaklaşan resmi tatil kalmadı."}
            </div>
          )}

          {upcomingChildren.length > 0 && (
            <section className="mt-6 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-background p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-text">
                  <Baby className="h-4 w-4 text-pink-500" />
                  Yaklaşan Çocuk Günleri
                </h2>
                <span className="text-xs text-muted">{upcomingChildren.length} gün</span>
              </div>
              <div className="space-y-2">
                {upcomingChildren.slice(0, 4).map((h) => (
                  <HolidayCard key={`child-${h.date}-${h.nameDe}`} h={h} state={state} compact />
                ))}
              </div>
            </section>
          )}

          {/* Tüm tatiller — aylık */}
          <div className="mt-8 space-y-8">
            <h2 className="text-lg font-semibold text-text">Resmi Tatiller — {year}</h2>
            {officialGrouped.map(([monthIdx, holidays]) => (
              <section key={`official-${monthIdx}`}>
                <h3 className="mb-3 text-base font-semibold text-primary">
                  {MONTHS[monthIdx]} {year}
                </h3>
                <div className="space-y-2">
                  {holidays.map((h) => (
                    <HolidayCard key={h.date + h.nameDe + "-official"} h={h} state={state} />
                  ))}
                </div>
              </section>
            ))}

            {childrenGrouped.length > 0 && (
              <>
                <h2 className="flex items-center gap-2 pt-4 text-lg font-semibold text-text">
                  <Baby className="h-5 w-5 text-pink-500" />
                  Çocuklarla İlgili Günler — {year}
                </h2>
                <p className="text-sm text-muted">
                  Resmi tatil olmayabilir; okul etkinlikleri, dernek kutlamaları ve aile gelenekleri
                  için önemli tarihler.
                </p>
                {childrenGrouped.map(([monthIdx, holidays]) => (
                  <section key={`children-${monthIdx}`}>
                    <h3 className="mb-3 text-base font-semibold text-pink-600 dark:text-pink-400">
                      {MONTHS[monthIdx]} {year}
                    </h3>
                    <div className="space-y-2">
                      {holidays.map((h) => (
                        <HolidayCard key={h.date + h.nameDe + "-child"} h={h} state={state} />
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
        </>
      )}

      <div className="mt-10 rounded-xl border border-border bg-background p-5 text-sm text-muted">
        <p className="font-medium text-text">Bilgi</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Telefon takvimine ekle</strong> butonu iPhone&apos;da Takvim
            uygulamasını açar ve tüm tatilleri abonelik olarak ekler; Android&apos;de
            varsayılan takvim uygulamasına aktarır.
          </li>
          <li>
            Masaüstünde .ics dosyası indirilir; Google Calendar veya Outlook&apos;a
            içe aktarabilirsiniz.
          </li>
          <li>Resmi tatillerde bankalar, resmi daireler ve çoğu mağaza kapalıdır.</li>
          <li>Bazı tatiller tüm eyaletlerde geçerlidir; diğerleri yalnızca belirli eyaletlere özeldir.</li>
          <li>Bayern ve Saarland&apos;da <em>Maria Himmelfahrt</em> (15 Ağustos) katolik bölgelerde resmi tatildir.</li>
          <li>Sachsen&apos;de ek olarak <em>Buß- und Bettag</em> (Tövbe ve Dua Günü) tatildir.</li>
          <li>
            <strong>Çocuk günleri:</strong> 23 Nisan, Nikolaus (6 Aralık), BM Çocuk Hakları Günü
            (20 Kasım) ve Dünya Çocuk Günü (20 Eylül) listeye dahildir; çoğu resmi tatil değildir.
          </li>
          <li>
            <strong>Weltkindertag</strong> (20 Eylül) yalnızca Thüringen&apos;de resmi tatildir.
          </li>
        </ul>
      </div>
    </PageContainer>
  );
}
