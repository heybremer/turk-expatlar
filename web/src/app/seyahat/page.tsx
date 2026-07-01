import Link from "next/link";
import { CheckCircle2, Plane, Plus } from "lucide-react";
import { api, CourierRequest, TravelAnnouncement } from "@/lib/api";
import { CourierCard } from "@/components/cards/CourierCard";
import { CourierDisclaimer } from "@/components/ui/CourierDisclaimer";
import { Button } from "@/components/ui/Button";
import { TravelAnnouncementCard } from "@/components/seyahat/TravelAnnouncementCard";

type CourierResponse = { items: CourierRequest[]; total: number };
type AnnouncementsResponse = { items: TravelAnnouncement[]; total: number };

function buildQuery(direction?: string, status?: string) {
  const params = new URLSearchParams();
  if (direction) params.set("direction", direction);
  if (status) params.set("status", status);
  const q = params.toString();
  return q ? `?${q}` : "";
}

async function getRequests(direction?: string, status?: string): Promise<CourierResponse> {
  try {
    return await api.get<CourierResponse>(`/courier/requests${buildQuery(direction, status)}`);
  } catch {
    return { items: [], total: 0 };
  }
}

async function getAnnouncements(direction?: string): Promise<AnnouncementsResponse> {
  try {
    const q = direction ? `?direction=${direction}` : "";
    return await api.get<AnnouncementsResponse>(`/travel-announcements${q}`);
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function SeyahatPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; tab?: string }>;
}) {
  const { direction, tab = "talepler" } = await searchParams;
  const isIlanlar = tab === "ilanlar";

  const [{ items: openItems }, { items: matchedItems }, { items: announcements }] =
    await Promise.all([
      getRequests(direction, "OPEN"),
      getRequests(direction, "MATCHED,COMPLETED"),
      getAnnouncements(direction),
    ]);

  function tabHref(t: string) {
    const p = new URLSearchParams({ tab: t });
    if (direction) p.set("direction", direction);
    return `/seyahat?${p.toString()}`;
  }

  function dirHref(d?: string) {
    const p = new URLSearchParams({ tab });
    if (d) p.set("direction", d);
    return `/seyahat?${p.toString()}`;
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Seyahat ile Eşya Taşıma</h1>
          <p className="text-muted">
            Türkiye–Almanya arası eşya gönderme, taşıyıcı bulma ve yolculuk ilanları
          </p>
        </div>
        {isIlanlar ? (
          <Link href="/seyahat/yolculuk/yeni">
            <Button>
              <Plane className="mr-1 h-4 w-4" />
              Yolculuk ilanı ver
            </Button>
          </Link>
        ) : (
          <Link href="/seyahat/yeni">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Talep oluştur
            </Button>
          </Link>
        )}
      </div>

      {/* Ana sekmeler */}
      <div className="mt-6 flex gap-1 rounded-xl border border-border bg-surface p-1">
        <Link
          href={tabHref("talepler")}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
            !isIlanlar
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Eşya Talepleri
        </Link>
        <Link
          href={tabHref("ilanlar")}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
            isIlanlar
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Yolculuk İlanları
        </Link>
      </div>

      {/* Yön filtreleri */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={dirHref()}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            !direction
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:border-primary"
          }`}
        >
          Tümü
        </Link>
        <Link
          href={dirHref("DE_TO_TR")}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            direction === "DE_TO_TR"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:border-primary"
          }`}
        >
          Almanya → Türkiye
        </Link>
        <Link
          href={dirHref("TR_TO_DE")}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            direction === "TR_TO_DE"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:border-primary"
          }`}
        >
          Türkiye → Almanya
        </Link>
      </div>

      <div className="mt-6">
        <CourierDisclaimer />
      </div>

      {/* --- YOLCULUK İLANLARI sekmesi --- */}
      {isIlanlar && (
        <section className="mt-8">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Plane className="h-12 w-12 text-muted opacity-40" />
              <p className="text-muted">Bu yönde henüz yolculuk ilanı yok.</p>
              <Link href="/seyahat/yolculuk/yeni">
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  İlk ilanı sen ver
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((a) => (
                <TravelAnnouncementCard key={a.id} announcement={a} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* --- EŞYA TALEPLERİ sekmesi --- */}
      {!isIlanlar && (
        <>
          {matchedItems.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Kabul edilen taşımalar</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {matchedItems.length}
                </span>
              </div>
              <p className="mb-4 text-sm text-muted">
                Teklifi onaylanmış, eşleşmiş veya tamamlanmış işlemler
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchedItems.map((r) => (
                  <CourierCard key={r.id} request={r} />
                ))}
              </div>
            </section>
          )}

          <section className={matchedItems.length > 0 ? "mt-10" : "mt-8"}>
            <h2 className="mb-4 text-lg font-semibold">Açık talepler</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openItems.length === 0 ? (
                <p className="col-span-3 py-12 text-center text-muted">
                  Bu yönde henüz açık talep yok.
                </p>
              ) : (
                openItems.map((r) => <CourierCard key={r.id} request={r} />)
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
