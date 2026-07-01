"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Languages,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { NewsDetailModal } from "./NewsDetailModal";
import { NewsImageWithFallback } from "./NewsImage";
import { PageContainer } from "@/components/layout/PageContainer";
import { FeatureDisabled } from "@/components/site/FeatureDisabled";
import {
  APP_FEATURE_LABELS,
  type AppFeatureKey,
  isAppFeatureEnabled,
} from "@/lib/uygulamalar-config";
import {
  formatNewsDate,
  sourceKindLabel,
  translateNewsItem,
  type NewsItem,
} from "./news-utils";

type LocationInfo = {
  name: string;
  stateName?: string;
};

type Props = {
  title: string;
  icon: ReactNode;
  feature?: AppFeatureKey;
  noProfileTitle: string;
  noProfileDescAuth: string;
  noProfileDescGuest: string;
  buildFetchUrl: (loc: LocationInfo) => string;
  resolveLocation: (profile: {
    state?: { name: string } | null;
    city?: { name: string } | null;
  } | null | undefined) => LocationInfo | null;
};

export function NewsFeedPage({
  title,
  icon,
  feature,
  noProfileTitle,
  noProfileDescAuth,
  noProfileDescGuest,
  buildFetchUrl,
  resolveLocation,
}: Props) {
  const { token, isAuthenticated } = useAuth();

  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [noProfile, setNoProfile] = useState(false);

  const [translated, setTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(null);
  const [translatedNews, setTranslatedNews] = useState<NewsItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [featureChecked, setFeatureChecked] = useState(!feature);
  const [featureAllowed, setFeatureAllowed] = useState(!feature);

  const displayNews = translated ? translatedNews : news;

  useEffect(() => {
    if (!feature) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";
    fetch(`${apiUrl}/api/site-settings/public`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => {
        if (settings) {
          setFeatureAllowed(isAppFeatureEnabled(settings, feature));
        }
      })
      .catch(() => setFeatureAllowed(false))
      .finally(() => setFeatureChecked(true));
  }, [feature]);

  const fetchNews = useCallback(async (loc: LocationInfo, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    setTranslated(false);
    setTranslatedNews([]);
    try {
      const items = await api.get<NewsItem[]>(buildFetchUrl(loc));
      setNews(items);
    } catch {
      setError("Haberler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildFetchUrl]);

  async function handleTranslate() {
    if (translating) return;
    if (translated) {
      setTranslated(false);
      return;
    }
    if (translatedNews.length === news.length && translatedNews.length > 0) {
      setTranslated(true);
      return;
    }

    setTranslating(true);
    setTranslateProgress({ done: 0, total: news.length });

    const results: NewsItem[] = [];
    for (let i = 0; i < news.length; i++) {
      const t = await translateNewsItem(news[i]);
      results.push({ ...news[i], title: t.title, summary: t.summary });
      setTranslateProgress({ done: i + 1, total: news.length });
      if (i < news.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    setTranslatedNews(results);
    setTranslated(true);
    setTranslating(false);
    setTranslateProgress(null);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function init() {
      if (feature && !featureChecked) return;
      if (feature && !featureAllowed) {
        setLoading(false);
        return;
      }
      if (!isAuthenticated() || !token) {
        setLoading(false);
        setNoProfile(true);
        return;
      }
      try {
        const me = await api.get<{ profile?: { state?: { name: string }; city?: { name: string } } | null }>(
          "/users/me",
          token,
        );
        const loc = resolveLocation(me.profile);
        if (!loc) {
          setNoProfile(true);
          setLoading(false);
          return;
        }
        setLocation(loc);
        await fetchNews(loc);
      } catch {
        setError("Profil bilgileri alınamadı.");
        setLoading(false);
      }
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, feature, featureChecked, featureAllowed]);

  if (feature && !featureChecked) {
    return (
      <PageContainer className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </PageContainer>
    );
  }

  if (feature && !featureAllowed) {
    const meta = APP_FEATURE_LABELS[feature];
    return <FeatureDisabled title={meta.title} description={meta.description} />;
  }

  return (
    <>
      <PageContainer>
        <Link
          href="/uygulamalar"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Uygulamalar
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {location && (
                <p className="flex items-center gap-1 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {location.name}
                  {location.stateName && location.stateName !== location.name && (
                    <span className="text-muted/70">· {location.stateName}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {news.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleTranslate()}
                disabled={translating}
                className={translated ? "border-accent/60 bg-accent/8 text-accent hover:bg-accent/15" : ""}
              >
                {translating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {translateProgress
                      ? `${translateProgress.done}/${translateProgress.total}`
                      : "Çevriliyor…"}
                  </>
                ) : translated ? (
                  <>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Orijinal Göster
                  </>
                ) : (
                  <>
                    <Languages className="mr-1.5 h-4 w-4" />
                    Türkçeye Çevir
                  </>
                )}
              </Button>

              {location && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchNews(location, true)}
                  disabled={refreshing || translating}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {translating && translateProgress && (
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-accent" />
                Haberler Türkçeye çevriliyor…
              </span>
              <span className="font-medium text-accent">
                {translateProgress.done} / {translateProgress.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-accent/15">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{
                  width: `${(translateProgress.done / translateProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {!translating && translated && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/8 px-2.5 py-0.5 text-xs font-medium text-accent">
              <Languages className="h-3 w-3" />
              Türkçe gösteriliyor
            </span>
            <span className="text-xs text-muted">
              MyMemory çevirisi · hatalı çeviriler olabilir
            </span>
          </div>
        )}

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-3 text-muted">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="text-sm">Haberler yükleniyor…</p>
          </div>
        )}

        {!loading && noProfile && (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
              <MapPin className="h-7 w-7 text-warning" />
            </div>
            <div>
              <p className="font-semibold">{noProfileTitle}</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                {mounted && isAuthenticated() ? noProfileDescAuth : noProfileDescGuest}
              </p>
            </div>
            <div className="flex gap-3">
              {mounted && !isAuthenticated() && (
                <Link
                  href="/giris"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                >
                  Giriş yap
                </Link>
              )}
              <Link
                href="/profil/duzenle"
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Profili düzenle
              </Link>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-4 text-center text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !noProfile && !error && news.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted">
            Şu an haber bulunamadı. Lütfen daha sonra tekrar deneyin.
          </div>
        )}

        {!loading && displayNews.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {displayNews.map((item, i) => {
              const kindLabel = sourceKindLabel(item.kind);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <NewsImageWithFallback
                    imageUrl={item.imageUrl}
                    title={item.title}
                    variant="card"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.source}
                      </span>
                      {kindLabel && (
                        <span className="rounded-full bg-accent/8 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {kindLabel}
                        </span>
                      )}
                    </div>
                    {item.pubDate && (
                      <span className="flex-shrink-0 text-[10px] text-muted">
                        {formatNewsDate(item.pubDate).split(",")[0]}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-snug text-text transition-colors group-hover:text-primary">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                      {item.summary}
                    </p>
                  )}
                  <span className="mt-auto text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Özeti gör →
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PageContainer>

      {selected && (
        <NewsDetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
