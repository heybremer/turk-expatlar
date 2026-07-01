import Link from "next/link";
import { Suspense } from "react";
import { api, SearchResults } from "@/lib/api";
import { EventCard } from "@/components/cards/EventCard";
import { ForumTopicCard } from "@/components/cards/ForumTopicCard";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { AraSearchBox } from "@/components/layout/AraSearchBox";

async function search(q: string): Promise<SearchResults> {
  if (!q || q.length < 2) return { topics: [], events: [], businesses: [] };
  try {
    return await api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
  } catch {
    return { topics: [], events: [], businesses: [] };
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await search(q);
  const total =
    results.topics.length + results.events.length + results.businesses.length;

  return (
    <div className="w-full min-w-0">
      <h1 className="text-2xl font-bold">Arama</h1>
      <p className="text-muted">Forum, etkinlik ve işletmelerde ara</p>

      <Suspense fallback={null}>
        <AraSearchBox />
      </Suspense>

      {q && (
        <p className="mt-4 text-sm text-muted">
          &ldquo;{q}&rdquo; için {total} sonuç
        </p>
      )}

      {!q && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">Aramak istediğiniz kelimeyi yukarıya yazın.</p>
          <p className="mt-2 text-sm text-muted">
            İpucu: Header&apos;daki <strong>Ara</strong> butonuna veya <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">Ctrl K</kbd> kısayoluna basabilirsiniz.
          </p>
        </div>
      )}

      {q && total === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">Hiç sonuç bulunamadı.</p>
          <p className="mt-2 text-sm text-muted">
            Forum&apos;da yeni bir soru sorabilirsin.
          </p>
          <Link
            href="/forum/yeni"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white"
          >
            Soru sor
          </Link>
        </div>
      )}

      {results.topics.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Forum ({results.topics.length})</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {results.topics.map((t) => (
              <ForumTopicCard key={t.id} topic={t} />
            ))}
          </div>
        </section>
      )}

      {results.events.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            Etkinlikler ({results.events.length})
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {results.businesses.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            İşletmeler ({results.businesses.length})
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.businesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
