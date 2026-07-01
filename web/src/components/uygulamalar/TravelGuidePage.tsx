"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { api, FederalState } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import {
  getTravelGuideBySlug,
  PLACE_CATEGORY_LABELS,
  placeMapsQuery,
  TRAVEL_GUIDE_BY_STATE,
  type PlaceCategory,
  type TravelPlace,
} from "@/lib/travel-guide-germany";

function PlaceCard({
  place,
  stateName,
}: {
  place: TravelPlace;
  stateName: string;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${placeMapsQuery(place, stateName)}`;

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Badge variant="muted">{PLACE_CATEGORY_LABELS[place.category]}</Badge>
          <h3 className="mt-2 text-lg font-semibold text-text">{place.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-3.5 w-3.5" />
            {place.city}
          </p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Harita <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text">{place.description}</p>
      {place.tip && (
        <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted">
          <span className="font-medium text-primary">İpucu:</span> {place.tip}
        </p>
      )}
    </article>
  );
}

export function TravelGuidePage() {
  const { token, isAuthenticated } = useAuth();
  const [states, setStates] = useState<FederalState[]>([]);
  const [stateSlug, setStateSlug] = useState("nordrhein-westfalen");
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    api
      .get<FederalState[]>("/locations/states")
      .then(setStates)
      .catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated() || !token) {
      setLoadingProfile(false);
      return;
    }
    api
      .get<{ profile?: { state?: { slug: string } | null } }>("/users/me", token)
      .then((user) => {
        const slug = user.profile?.state?.slug;
        if (slug && getTravelGuideBySlug(slug)) setStateSlug(slug);
      })
      .catch(() => undefined)
      .finally(() => setLoadingProfile(false));
  }, [token, isAuthenticated]);

  const guide = useMemo(() => getTravelGuideBySlug(stateSlug), [stateSlug]);

  const filteredPlaces = useMemo(() => {
    if (!guide) return [];
    const q = query.trim().toLowerCase();
    return guide.places.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [guide, categoryFilter, query]);

  const handleStateChange = useCallback((slug: string) => {
    setStateSlug(slug);
    setQuery("");
    setCategoryFilter("all");
  }, []);

  const categories = useMemo(() => {
    if (!guide) return [];
    const set = new Set(guide.places.map((p) => p.category));
    return (Object.keys(PLACE_CATEGORY_LABELS) as PlaceCategory[]).filter((c) =>
      set.has(c),
    );
  }, [guide]);

  return (
    <PageContainer>
      <Link
        href="/uygulamalar"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Uygulamalara dön
      </Link>

      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
          <Compass className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gezgin Rehberi</h1>
          <p className="mt-1 text-sm text-muted">
            Eyaletinize göre gezilecek yerler, kısa bilgiler ve pratik ipuçları
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="state-select" className="block text-sm font-medium text-text">
          Eyalet seçin
        </label>
        <div className="relative mt-1.5">
          {loadingProfile && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
          )}
          <select
            id="state-select"
            value={stateSlug}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-md"
          >
            {(states.length ? states : TRAVEL_GUIDE_BY_STATE.map((s) => ({ slug: s.slug, name: s.name }))).map(
              (s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {guide && (
        <>
          <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
            {guide.intro}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Yer veya şehir ara…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  categoryFilter === "all"
                    ? "border-primary bg-primary text-white"
                    : "border-border text-muted hover:border-primary hover:text-primary"
                }`}
              >
                Tümü
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    categoryFilter === cat
                      ? "border-primary bg-primary text-white"
                      : "border-border text-muted hover:border-primary hover:text-primary"
                  }`}
                >
                  {PLACE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-muted">
            {filteredPlaces.length} yer · {guide.name}
          </p>

          {filteredPlaces.length === 0 ? (
            <p className="mt-12 text-center text-muted">Bu filtreye uygun yer bulunamadı.</p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {filteredPlaces.map((place) => (
                <PlaceCard key={`${place.name}-${place.city}`} place={place} stateName={guide.name} />
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
