"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Globe } from "lucide-react";
import { api, HomeFeed } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EventCard } from "@/components/cards/EventCard";
import { ForumTopicCard } from "@/components/cards/ForumTopicCard";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { Button } from "@/components/ui/Button";

export default function AkisPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState(true);

  const stateId = user?.profile?.stateId;
  const cityId = user?.profile?.cityId;
  const locationName =
    user?.profile?.city?.name ??
    user?.profile?.state?.name ??
    null;
  const hasLocation = !!(stateId || cityId);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (local && stateId) qs.set("stateId", stateId);
    if (local && cityId) qs.set("cityId", cityId);
    api
      .get<HomeFeed>(`/feed/home?${qs}`)
      .then(setFeed)
      .catch(() =>
        setFeed({ events: [], topics: [], businesses: [], guide: [] }),
      )
      .finally(() => setLoading(false));
  }, [local, stateId, cityId]);

  return (
    <div className="w-full min-w-0">
      {/* Başlık */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Akış</h1>
          <p className="text-muted">Şehrinde neler oluyor?</p>
        </div>
        <div className="flex gap-2">
          <Link href="/forum/yeni">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Soru Sor
            </Button>
          </Link>
          <Link href="/etkinlikler/yeni">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Etkinlik Oluştur
            </Button>
          </Link>
        </div>
      </div>

      {/* Konum filtresi */}
      {hasLocation && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setLocal(true)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              local
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {locationName ?? "Konumum"}
          </button>
          <button
            onClick={() => setLocal(false)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              !local
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Tüm Almanya
          </button>
        </div>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : (
        <>
          {/* Etkinlikler */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Yakındaki Etkinlikler</h2>
              <Link href="/etkinlikler" className="text-sm text-primary hover:underline">
                Tümü →
              </Link>
            </div>
            {!feed?.events.length ? (
              <EmptyState
                message="Bu bölgede yaklaşan etkinlik yok."
                href="/etkinlikler/yeni"
                action="Etkinlik Oluştur"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {feed.events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>

          {/* Forum konuları */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Popüler Konular</h2>
              <Link href="/forum" className="text-sm text-primary hover:underline">
                Tümü →
              </Link>
            </div>
            {!feed?.topics.length ? (
              <EmptyState
                message="Henüz forum konusu yok."
                href="/forum/yeni"
                action="İlk Soruyu Sor"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {feed.topics.map((t) => (
                  <ForumTopicCard key={t.id} topic={t} />
                ))}
              </div>
            )}
          </section>

          {/* İşletmeler */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Önerilen İşletmeler</h2>
              <Link href="/rehber" className="text-sm text-primary hover:underline">
                Tümü →
              </Link>
            </div>
            {!feed?.businesses.length ? (
              <EmptyState
                message="Bu bölgede kayıtlı işletme yok."
                href="/rehber"
                action="Rehbere Git"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {feed.businesses.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            )}
          </section>

          {/* Yeni gelen rehberi */}
          {feed?.guide && feed.guide.length > 0 && (
            <section className="mt-10 rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Yeni Gelen Rehberi</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {feed.guide.map((g) => (
                  <Link
                    key={g.slug}
                    href="/rehber/yeni-gelen"
                    className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
                  >
                    {g.title}
                  </Link>
                ))}
              </div>
              <div className="mt-4">
                <Link href="/rehber/yeni-gelen" className="text-sm text-primary hover:underline">
                  Tüm yeni gelen rehberini gör →
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  message,
  href,
  action,
}: {
  message: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
      <p className="text-muted">{message}</p>
      <Link href={href} className="mt-4 inline-block">
        <Button variant="outline" size="sm">
          {action}
        </Button>
      </Link>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="mt-8 space-y-10 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="h-6 w-48 rounded bg-surface" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-40 rounded-xl bg-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
