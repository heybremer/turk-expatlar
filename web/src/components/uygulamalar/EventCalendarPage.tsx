"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  Music,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FEATURED_CITIES, profileCityToFilter } from "@/lib/event-calendar-cities";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  city: string;
  venue?: string;
  address?: string;
  cost?: string;
  costValue?: number;
  category?: string;
  categories: string[];
  imageUrl?: string;
  ticketUrl?: string;
  detailUrl: string;
  artist?: string;
  source: "vasistdas" | "platform";
};

type EventsResponse = {
  items: CalendarEvent[];
  total: number;
  cities: string[];
  categories: string[];
};

const WEEKDAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function formatEventTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

export function EventCalendarPage() {
  const { token, isAuthenticated } = useAuth();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [city, setCity] = useState("Almanya");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [profileCityHint, setProfileCityHint] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (city && city !== "Almanya") params.set("city", city);
      if (category) params.set("category", category);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await api.get<EventsResponse>(
        `/event-calendar/events?${params}`,
        token ?? undefined,
      );
      setData(res);
    } catch {
      setError("Etkinlikler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, category, debouncedSearch, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isAuthenticated() || !token) return;
    api
      .get<{ profile?: { city?: { name: string } | null } }>("/users/me", token)
      .then((user) => {
        const profileCity = user.profile?.city?.name;
        if (!profileCity) return;
        setProfileCityHint(profileCity);
        setCity(profileCityToFilter(profileCity));
      })
      .catch(() => undefined);
  }, [token, isAuthenticated]);

  const cityOptions = useMemo(() => {
    const extra = (data?.cities ?? []).filter(
      (c) => !(FEATURED_CITIES as readonly string[]).includes(c),
    );
    return [...FEATURED_CITIES, ...extra.slice(0, 8)];
  }, [data?.cities]);

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of items) {
      const key = monthKey(ev.startDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data?.items]);

  const categories = data?.categories ?? [];

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
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Etkinlik Takvimi</h1>
            <p className="text-sm text-muted">
              Almanya&apos;daki Türk konser, tiyatro ve kültür etkinlikleri
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Şehir filtreleri — Vasistdas tarzı */}
      <div className="mt-6 flex flex-wrap gap-2">
        {cityOptions.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCity(c)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              city === c
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Arama ve kategori */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sanatçı, etkinlik veya mekan ara…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm text-muted">
        {loading ? "Yükleniyor…" : `${data?.total ?? 0} etkinlik bulundu`}
        {city !== "Almanya" && ` · ${city}`}
        {profileCityHint && city === "Almanya" && (
          <span className="ml-1">
            · Profiliniz: {profileCityHint}
          </span>
        )}
      </p>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-surface p-10 text-center">
          <Music className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 font-medium">Etkinlik bulunamadı</p>
          <p className="mt-1 text-sm text-muted">
            {city !== "Almanya" || category || debouncedSearch
              ? "Farklı bir şehir veya kategori deneyin."
              : "Şu an listelenecek yaklaşan etkinlik yok."}
          </p>
          {(city !== "Almanya" || category || debouncedSearch) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setCity("Almanya");
                setCategory("");
                setSearch("");
              }}
            >
              Tüm Almanya&apos;yı göster
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {grouped.map(([key, events]) => (
            <section key={key}>
              <h2 className="mb-4 text-lg font-semibold text-primary">
                {monthLabel(key)}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => {
                  const d = new Date(ev.startDate);
                  const href = ev.source === "platform" ? ev.detailUrl : (ev.ticketUrl || ev.detailUrl);
                  const external = ev.source === "vasistdas";

                  return (
                    <article
                      key={ev.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/30"
                    >
                      {/* Üst resim — 1:1 kare */}
                      {ev.imageUrl && (
                        <div className="relative aspect-square w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ev.imageUrl}
                            alt={ev.title}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const parent = (e.currentTarget as HTMLImageElement).closest(".aspect-square") as HTMLElement | null;
                              if (parent) parent.style.display = "none";
                            }}
                          />
                          {ev.category && (
                            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                              {ev.category}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-4 p-4">
                        {/* Tarih kutusu */}
                        <div className="flex h-[72px] w-[72px] flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary/8 text-center">
                          <span className="text-xs font-medium uppercase text-primary">
                            {WEEKDAYS[d.getDay()]}
                          </span>
                          <span className="text-2xl font-bold leading-none text-text">
                            {d.getDate()}
                          </span>
                          <span className="text-[10px] text-muted">
                            {MONTHS[d.getMonth()].slice(0, 3)}
                          </span>
                        </div>

                        {/* İçerik */}
                        <div className="min-w-0 flex-1">
                          {!ev.imageUrl && ev.category && (
                            <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                              {ev.category}
                            </span>
                          )}
                          <h3 className={`font-semibold leading-snug text-text ${!ev.imageUrl && ev.category ? "mt-1" : ""}`}>
                            {ev.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            <span>{formatEventTime(ev.startDate)}</span>
                            {ev.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ev.venue}
                              </span>
                            )}
                            <span>{ev.city}</span>
                          </div>
                          {ev.artist && ev.artist !== ev.title && (
                            <p className="mt-1 text-xs text-muted">{ev.artist}</p>
                          )}
                        </div>

                        {/* Fiyat + link */}
                        <div className="flex flex-shrink-0 flex-col items-end justify-between gap-2">
                          {ev.cost && (
                            <span className="rounded-lg bg-background px-2.5 py-1 text-sm font-semibold text-text">
                              {ev.cost}
                            </span>
                          )}
                          {external ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                            >
                              <Ticket className="h-3.5 w-3.5" />
                              Bilet
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                            >
                              Detay
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
        Konser ve etkinlik verileri{" "}
        <a
          href="https://vasistdas.de/koln-konser-etkinlik-takvimi/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Vasistdas.de
        </a>{" "}
        üzerinden derlenmektedir. Platform etkinlikleri de listeye dahildir.
      </p>
    </PageContainer>
  );
}
