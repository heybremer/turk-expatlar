"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, DollarSign, Plus, Users, X } from "lucide-react";
import { api, Event } from "@/lib/api";
import { EventCard } from "@/components/cards/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Filter = {
  thisWeek: boolean;
  priceType: "FREE" | "PAID" | null;
  category: string | null;
};

const CATEGORIES = ["Aile", "Networking", "Kültür", "Spor", "Eğitim", "Eğlence", "Diğer"];

const INITIAL_FILTER: Filter = { thisWeek: false, priceType: null, category: null };

export default function EtkinliklerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(INITIAL_FILTER);

  const activeFilterCount =
    (filter.thisWeek ? 1 : 0) +
    (filter.priceType ? 1 : 0) +
    (filter.category ? 1 : 0);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filter.thisWeek) qs.set("thisWeek", "true");
    if (filter.priceType) qs.set("priceType", filter.priceType);
    if (filter.category) qs.set("category", filter.category);

    api
      .get<{ items: Event[]; total: number }>(`/events?${qs}`)
      .then((data) => { setEvents(data.items); setTotal(data.total); })
      .catch(() => { setEvents([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [filter]);

  function toggleFilter<K extends keyof Filter>(key: K, value: Filter[K]) {
    setFilter((prev) => ({ ...prev, [key]: prev[key] === value ? (typeof value === "boolean" ? false : null) : value }));
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Etkinlikler</h1>
          <p className="text-muted">Şehrindeki buluşmalara katıl</p>
        </div>
        <Link href="/etkinlikler/yeni">
          <Button><Plus className="mr-1 h-4 w-4" />Etkinlik Oluştur</Button>
        </Link>
      </div>

      {/* Filtreler */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => toggleFilter("thisWeek", true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
            filter.thisWeek ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary hover:text-text",
          )}
        >
          <Calendar className="h-3.5 w-3.5" />Bu Hafta
        </button>

        <button
          onClick={() => toggleFilter("priceType", "FREE")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
            filter.priceType === "FREE" ? "border-success bg-success/10 text-success" : "border-border text-muted hover:border-success hover:text-text",
          )}
        >
          <DollarSign className="h-3.5 w-3.5" />Ücretsiz
        </button>

        <button
          onClick={() => toggleFilter("priceType", "PAID")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
            filter.priceType === "PAID" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:border-accent hover:text-text",
          )}
        >
          Ücretli
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleFilter("category", cat)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
              filter.category === cat ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary hover:text-text",
            )}
          >
            <Users className="h-3.5 w-3.5" />{cat}
          </button>
        ))}

        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilter(INITIAL_FILTER)}
            className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
          >
            <X className="h-3.5 w-3.5" />Filtreyi temizle ({activeFilterCount})
          </button>
        )}
      </div>

      {total > 0 && !loading && (
        <p className="mt-4 text-sm text-muted">{total} etkinlik bulundu</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-surface" />
          ))
        ) : events.length === 0 ? (
          <EmptyState
            title="Etkinlik bulunamadı"
            description={activeFilterCount > 0 ? "Farklı filtreler deneyin veya filtreyi temizleyin." : "Şehrinde bir buluşma, kahvaltı veya networking etkinliği oluşturarak topluluğu hareketlendir."}
            actionLabel={activeFilterCount > 0 ? undefined : "Etkinlik oluştur"}
            actionHref={activeFilterCount > 0 ? undefined : "/etkinlikler/yeni"}
          />
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
