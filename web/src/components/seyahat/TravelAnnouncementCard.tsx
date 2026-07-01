import Link from "next/link";
import { Plane, Package, Calendar, User } from "lucide-react";
import { TravelAnnouncement } from "@/lib/api";

type Props = { announcement: TravelAnnouncement };

const DIRECTION_LABEL: Record<string, string> = {
  DE_TO_TR: "Almanya → Türkiye",
  TR_TO_DE: "Türkiye → Almanya",
};

const DIRECTION_ICON: Record<string, string> = {
  DE_TO_TR: "🇩🇪 → 🇹🇷",
  TR_TO_DE: "🇹🇷 → 🇩🇪",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TravelAnnouncementCard({ announcement: a }: Props) {
  const name = a.user?.profile?.displayName ?? "Kullanıcı";
  const requestCount = a._count?.requests ?? a.requestCount ?? 0;

  return (
    <Link href={`/seyahat/yolculuk/${a.id}`} className="block group">
      <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50">
        {/* Direction badge */}
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Plane className="h-3 w-3" />
            {DIRECTION_ICON[a.direction] ?? DIRECTION_LABEL[a.direction] ?? a.direction}
          </span>
          {a.status !== "OPEN" && (
            <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
              {a.status === "CLOSED" ? "Kapalı" : "Süresi doldu"}
            </span>
          )}
        </div>

        {/* Cities */}
        <p className="mb-1 text-lg font-bold leading-tight">
          {a.fromCity} → {a.toCity}
        </p>

        {/* Date */}
        <div className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {formatDate(a.departureDate)}
        </div>

        {/* Notes */}
        {a.notes && (
          <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted">{a.notes}</p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          {/* Traveler */}
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <User className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{name}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            {a.availableKg != null && (
              <span className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {a.availableKg} kg
              </span>
            )}
            {requestCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {requestCount} teklif
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
