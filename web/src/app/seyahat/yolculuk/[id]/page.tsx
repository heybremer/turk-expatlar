"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { ArrowLeft, Calendar, Package, Plane, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, TravelAnnouncement } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { TravelRequestForm } from "@/components/seyahat/TravelRequestForm";
import { TravelRequestList } from "@/components/seyahat/TravelRequestList";
import { useAuth } from "@/lib/auth";

const DIRECTION_LABEL: Record<string, string> = {
  DE_TO_TR: "🇩🇪 Almanya → Türkiye 🇹🇷",
  TR_TO_DE: "🇹🇷 Türkiye → Almanya 🇩🇪",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function YolculukDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [announcement, setAnnouncement] = useState<TravelAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  async function load() {
    try {
      const data = await api.get<TravelAnnouncement>(`/travel-announcements/${id}`);
      setAnnouncement(data);
    } catch {
      router.push("/seyahat?tab=ilanlar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleClose() {
    if (!confirm("İlanı kapatmak istediğinizden emin misiniz?")) return;
    setClosing(true);
    try {
      await api.patch(`/travel-announcements/${id}/close`, {});
      await load();
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-muted/20" />
          <div className="h-48 rounded-2xl bg-muted/20" />
        </div>
      </div>
    );
  }

  if (!announcement) return null;

  const isOwner = user?.id === announcement.user?.id;
  const isOpen = announcement.status === "OPEN";
  const hasMyRequest = !!announcement.myRequest;
  const canRequest = !isOwner && isOpen && !!user && !hasMyRequest;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/seyahat?tab=ilanlar"
        className="mb-6 flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Yolculuk İlanları
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <Plane className="h-4 w-4" />
            {DIRECTION_LABEL[announcement.direction] ?? announcement.direction}
          </span>
          {announcement.status !== "OPEN" && (
            <span className="rounded-full bg-muted/20 px-3 py-1 text-sm text-muted">
              {announcement.status === "CLOSED" ? "Kapalı" : "Süresi doldu"}
            </span>
          )}
        </div>

        <h1 className="mb-2 text-2xl font-bold">
          {announcement.fromCity} → {announcement.toCity}
        </h1>

        <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" />
            {formatDate(announcement.departureDate)}
          </span>
          {announcement.availableKg != null && (
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 shrink-0" />
              {announcement.availableKg} kg kapasitesi var
            </span>
          )}
        </div>

        {announcement.notes && (
          <p className="mb-4 rounded-lg bg-background p-3 text-sm text-muted">
            {announcement.notes}
          </p>
        )}

        {/* Traveler info */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(announcement.user?.profile?.displayName ?? "K").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">
                {announcement.user?.profile?.displayName ?? "Kullanıcı"}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted">
                <User className="h-3 w-3" />
                Yolcu
                {(announcement.user?.profile?.trustScore ?? 0) > 0 && (
                  <span className="ml-1 text-amber-500">
                    ★ {announcement.user!.profile!.trustScore}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(announcement.requestCount ?? 0) > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {announcement.requestCount} teklif
            </span>
          )}
        </div>

        {/* Owner: close button */}
        {isOwner && isOpen && (
          <div className="mt-4 border-t border-border pt-4">
            <Button
              variant="danger"
              size="sm"
              loading={closing}
              onClick={handleClose}
              className="ml-auto flex"
            >
              <X className="mr-1.5 h-4 w-4" />
              İlanı Kapat
            </Button>
          </div>
        )}
      </div>

      {/* Owner: requests list */}
      {isOwner && (announcement.requests ?? []).length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Gelen Teklifler ({announcement.requests!.length})
          </h2>
          <TravelRequestList
            announcementId={id}
            requests={announcement.requests!}
            isOwner
            onUpdate={load}
          />
        </div>
      )}

      {/* Request form */}
      {canRequest && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-1 text-lg font-semibold">Talep Gönder</h2>
          <p className="mb-4 text-sm text-muted">
            Bu yolcuya götürmesini istediğiniz bir şey var mı?
          </p>
          <TravelRequestForm announcementId={id} onSuccess={load} />
        </div>
      )}

      {/* My existing request */}
      {!isOwner && hasMyRequest && announcement.myRequest && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-3 text-lg font-semibold">Teklifiniz</h2>
          <TravelRequestList
            announcementId={id}
            requests={[announcement.myRequest]}
            isOwner={false}
          />
        </div>
      )}

      {!isOpen && (
        <p className="mt-6 rounded-xl border border-border p-4 text-center text-sm text-muted">
          Bu ilan kapalı, artık teklif verilemez.
        </p>
      )}
      {isOpen && !user && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="mb-3 text-sm text-muted">
            Teklif göndermek için giriş yapmanız gerekiyor.
          </p>
          <Link href="/giris">
            <Button size="sm">Giriş Yap</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
