import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Hash,
  MapPin,
  MessageCircle,
  Newspaper,
  Plus,
} from "lucide-react";
import { api, CityDetail } from "@/lib/api";
import { fetchPublicSiteSettingsLive } from "@/lib/site-settings";
import { isAppRouteEnabled } from "@/lib/uygulamalar-config";
import { EventCard } from "@/components/cards/EventCard";
import { ForumTopicCard } from "@/components/cards/ForumTopicCard";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { EmptyStateInline } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

async function getCity(slug: string): Promise<CityDetail | null> {
  try {
    return await api.get<CityDetail>(`/locations/cities/${slug}`);
  } catch {
    return null;
  }
}

function citySlugToChat(slug: string) {
  return `/sohbet/sehir/${slug}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCity(slug);
  if (!data) return { title: "Şehir bulunamadı" };
  return {
    title: `${data.city.name} — Türkçe konuşan topluluk`,
    description: `${data.city.name}'de Türkçe konuşanlar için etkinlikler, sorular ve güvenilir işletmeler.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCity(slug);
  const settings = await fetchPublicSiteSettingsLive();

  if (!data) notFound();

  const appLinks = [
    ...(isAppRouteEnabled(settings, "/uygulamalar/sehir-haberleri")
      ? [
          {
            href: `/uygulamalar/sehir-haberleri?city=${encodeURIComponent(data.city.name)}`,
            label: "Şehir Haberleri",
            icon: Newspaper,
          },
        ]
      : []),
    {
      href: `/uygulamalar/etkinlik-takvimi?city=${encodeURIComponent(data.city.name)}`,
      label: "Etkinlik Takvimi",
      icon: CalendarDays,
    },
    {
      href: citySlugToChat(slug),
      label: "Şehir Sohbeti",
      icon: MessageCircle,
    },
    {
      href: `/forum?search=${encodeURIComponent(data.city.name)}`,
      label: "Forum araması",
      icon: Hash,
    },
  ];

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" />
            {data.city.state.name}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{data.city.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {data.stats.topicCount} konu · {data.stats.businessCount} işletme
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/forum/yeni">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Soru sor
            </Button>
          </Link>
          <Link href="/etkinlikler/yeni">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Etkinlik oluştur
            </Button>
          </Link>
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {appLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </section>

      <section className="mt-8">
        <SectionHeader title="Yaklaşan Etkinlikler" href="/etkinlikler" />
        {data.events.length === 0 ? (
          <div className="mt-4">
            <EmptyStateInline
              message={`${data.city.name}'de yaklaşan etkinlik yok.`}
              actionLabel="Etkinlik oluştur"
              actionHref="/etkinlikler/yeni"
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeader title="Popüler Konular" href="/forum" />
        {data.topics.length === 0 ? (
          <div className="mt-4">
            <EmptyStateInline
              message={`${data.city.name}'de henüz forum konusu yok.`}
              actionLabel="İlk soruyu sor"
              actionHref="/forum/yeni"
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.topics.map((t) => (
              <ForumTopicCard key={t.id} topic={t} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeader title="Önerilen İşletmeler" href="/rehber" />
        {data.businesses.length === 0 ? (
          <div className="mt-4">
            <EmptyStateInline
              message={`${data.city.name}'de işletme kaydı yok.`}
              actionLabel="İşletmeni ekle"
              actionHref="/rehber/yeni"
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.businesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link href={href} className="text-sm text-primary hover:underline">
        Tümünü gör →
      </Link>
    </div>
  );
}
