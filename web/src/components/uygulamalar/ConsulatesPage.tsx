"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Clock,
  ExternalLink,
  Flag,
  Mail,
  MapPin,
  Phone,
  Search,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import {
  CONSULAR_CALL_CENTER,
  mapsUrl,
  MISSION_TYPE_LABELS,
  telUrl,
  TURKISH_MISSIONS_GERMANY,
  type ConsulateType,
  type TurkishMission,
} from "@/lib/turkish-consulates-germany";

function MissionCard({ mission }: { mission: TurkishMission }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge
            variant={
              mission.type === "embassy"
                ? "accent"
                : mission.type === "honorary"
                  ? "muted"
                  : "default"
            }
          >
            {MISSION_TYPE_LABELS[mission.type]}
          </Badge>
          <h2 className="mt-2 text-lg font-semibold text-text">{mission.name}</h2>
          <p className="text-sm text-muted">{mission.city}</p>
        </div>
        {mission.website && (
          <a
            href={mission.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Resmi site <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        <a
          href={mapsUrl(mission)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 text-text hover:text-primary"
        >
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" />
          <span>
            {mission.address}
            {mission.postalCode && (
              <>
                <br />
                {mission.postalCode} {mission.city}
              </>
            )}
            {!mission.postalCode && mission.address !== mission.city && (
              <>
                <br />
                {mission.city}
              </>
            )}
          </span>
        </a>

        <a
          href={telUrl(mission.phone)}
          className="flex items-center gap-2 font-medium text-primary hover:underline"
        >
          <Phone className="h-4 w-4" />
          {mission.phone}
          {mission.id === "kassel" && (
            <span className="font-normal text-muted"> (çağrı merkezi)</span>
          )}
        </a>

        {mission.emergencyPhone && (
          <a
            href={telUrl(mission.emergencyPhone)}
            className="flex items-center gap-2 text-muted hover:text-primary"
          >
            <Phone className="h-4 w-4" />
            Acil: {mission.emergencyPhone}
          </a>
        )}

        {mission.email && (
          <a
            href={`mailto:${mission.email}`}
            className="flex items-center gap-2 text-muted hover:text-primary"
          >
            <Mail className="h-4 w-4" />
            {mission.email}
          </a>
        )}

        {mission.hours && (
          <p className="flex items-start gap-2 text-muted">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {mission.hours}
          </p>
        )}

        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            <strong className="text-text">Görev bölgesi:</strong> {mission.jurisdiction}
          </span>
        </p>
      </div>
    </article>
  );
}

export function ConsulatesPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ConsulateType | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TURKISH_MISSIONS_GERMANY.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        m.jurisdiction.toLowerCase().includes(q) ||
        m.postalCode.includes(q)
      );
    });
  }, [query, typeFilter]);

  const grouped = useMemo(() => {
    const order: ConsulateType[] = ["embassy", "general", "honorary"];
    return order
      .map((type) => ({
        type,
        items: filtered.filter((m) => m.type === type),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

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
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Flag className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Türk Konsoloslukları</h1>
          <p className="mt-1 text-sm text-muted">
            Almanya&apos;daki büyükelçilik, başkonsolosluk ve fahri konsoloslukların iletişim bilgileri
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium text-text">{CONSULAR_CALL_CENTER.label}</p>
        <a
          href={telUrl(CONSULAR_CALL_CENTER.phone)}
          className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
        >
          <Phone className="h-5 w-5" />
          {CONSULAR_CALL_CENTER.phone}
        </a>
        <p className="mt-2 text-xs text-muted">
          Randevu ve konsolosluk işlemleri için{" "}
          <a
            href="https://www.konsolosluk.gov.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            konsolosluk.gov.tr
          </a>{" "}
          üzerinden online randevu alabilirsiniz.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Şehir, eyalet veya konsolosluk ara…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Tümü"],
              ["embassy", "Büyükelçilik"],
              ["general", "Başkonsolosluk"],
              ["honorary", "Fahri"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === value
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted hover:border-primary hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        {filtered.length} temsilcilik listeleniyor · Bilgiler resmi kaynaklara dayanır; güncel saatler için
        ilgili temsilciliğin sitesini kontrol edin.
      </p>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-muted">Aramanıza uygun temsilcilik bulunamadı.</p>
      ) : (
        <div className="mt-6 space-y-10">
          {grouped.map(({ type, items }) => (
            <section key={type}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                {MISSION_TYPE_LABELS[type]}
                <span className="ml-2 font-normal normal-case">({items.length})</span>
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
