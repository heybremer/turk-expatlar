"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Download, MapPin, Users } from "lucide-react";
import { api, Event } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ReportButton } from "@/components/ui/ReportDialog";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { MapView } from "@/components/ui/MapView";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";

function toIcs(event: Event): string {
  const dt = (d: string) =>
    new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${event.id}@turkexpatlar.de`,
    `DTSTART:${dt(event.startsAt)}`,
    event.endsAt ? `DTEND:${dt(event.endsAt)}` : "",
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location}, ${event.city.name}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export default function EtkinlikDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const data = await api.get<Event>(`/events/${params.id}`);
      setEvent(data);
      setNotFound(false);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 404) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : "Etkinlik yüklenemedi");
      }
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function attend(status: "GOING" | "INTERESTED") {
    if (!token) { router.push("/giris"); return; }
    setBusy(true);
    try {
      await api.post(`/events/${params.id}/attend?status=${status}`, {}, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  function downloadIcs() {
    if (!event) return;
    const blob = new Blob([toIcs(event)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${event.title}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-surface" />
        <div className="h-8 w-2/3 rounded bg-surface" />
        <div className="h-36 rounded bg-surface" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full min-w-0 py-4 text-center">
        <p className="text-xl font-semibold">Etkinlik bulunamadı</p>
        <p className="mt-2 text-muted">Bu etkinlik silinmiş veya hiç oluşturulmamış olabilir.</p>
        <Link href="/etkinlikler" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Etkinliklere dön
        </Link>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="w-full min-w-0 py-4 text-center">
        <p className="text-muted">{error}</p>
        <button onClick={() => void load()} className="mt-3 text-sm text-primary hover:underline">
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!event) return null;

  const attendeeCount = event._count?.attendees ?? 0;
  const isFull = !!event.capacity && attendeeCount >= event.capacity;

  return (
    <div className="w-full min-w-0">
      <Link href="/etkinlikler" className="text-sm text-muted hover:text-primary">
        ← Etkinliklere dön
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={event.priceType === "FREE" ? "success" : "accent"}>
          {event.priceType === "FREE" ? "Ücretsiz" : `${event.priceAmount ?? ""} €`}
        </Badge>
        {event.category && <Badge variant="muted">{event.category}</Badge>}
        {isFull && <Badge variant="warning">Dolu</Badge>}
      </div>

      <h1 className="mt-3 break-words text-2xl font-bold">{event.title}</h1>

      <div className="mt-4 grid gap-2 text-sm text-muted">
        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{formatDate(event.startsAt)}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location} · {event.city.name}, {event.state.name}</p>
        <p className="flex items-center gap-2"><Users className="h-4 w-4" />{attendeeCount} kişi katılıyor{event.capacity ? ` / ${event.capacity}` : ""}</p>
      </div>

      <Card className="mt-6">
        <p className="whitespace-pre-wrap text-text">{event.description}</p>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => attend("GOING")} disabled={busy || isFull}>
          {isFull ? "Etkinlik dolu" : "Katılıyorum"}
        </Button>
        <Button variant="outline" onClick={() => attend("INTERESTED")} disabled={busy}>
          İlgileniyorum
        </Button>
        <Button variant="ghost" onClick={downloadIcs}>
          <Download className="mr-1 h-4 w-4" />Takvime ekle
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <ReportButton targetType="EVENT" targetId={event.id} />
        </div>
      </div>

      <ShareButtons
        title={event.title}
        text={`${event.title} — Türk Expatlar Etkinlikler`}
        className="mt-4"
      />

      {/* Konum haritası */}
      {event.latitude && event.longitude ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-muted">Konum</h3>
          <MapView
            markers={[{
              lat: event.latitude,
              lng: event.longitude,
              title: event.title,
              subtitle: event.location,
              color: "primary",
            }]}
            zoom={14}
            height="280px"
          />
        </div>
      ) : event.location && (
        <div className="mt-4">
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(event.location + ', ' + event.city.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <MapPin className="h-4 w-4" />
            Haritada göster →
          </a>
        </div>
      )}

      {event.organizer && (
        <div className="mt-8 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Organizatör</p>
          <UserDisplayName name={event.organizer.profile?.displayName ?? "Kullanıcı"} userId={event.organizer.id} postalCountry={event.organizer.profile?.postalCountry as PostalCountry | undefined} linkToProfile={false} nameClassName="mt-1" />
        </div>
      )}

      {event.attendees && event.attendees.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted">Katılımcılar</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.attendees.slice(0, 12).map((a) => (
              <span key={a.user.id} className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs">
                <UserDisplayName name={a.user.profile?.displayName ?? "Kullanıcı"} userId={a.user.id} postalCountry={a.user.profile?.postalCountry as PostalCountry | undefined} linkToProfile={false} nameClassName="font-normal" />
              </span>
            ))}
            {event.attendees.length > 12 && <span className="text-xs text-muted">+{event.attendees.length - 12} kişi</span>}
          </div>
        </div>
      )}
    </div>
  );
}
