"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Landmark,
  Phone,
  Search,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import {
  INSTITUTION_CATEGORY_LABELS,
  INSTITUTION_SCOPE_LABELS,
  OFFICIAL_HOTLINES,
  OFFICIAL_INSTITUTIONS,
  telUrl,
  type InstitutionCategory,
  type OfficialInstitution,
} from "@/lib/germany-official-institutions";

function InstitutionCard({ inst }: { inst: OfficialInstitution }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{INSTITUTION_CATEGORY_LABELS[inst.category]}</Badge>
            <Badge variant="muted">{INSTITUTION_SCOPE_LABELS[inst.scope]}</Badge>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-text">{inst.name}</h2>
          <p className="text-sm text-muted">{inst.nameDe}</p>
        </div>
        <a
          href={inst.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Resmi site <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text">{inst.description}</p>

      <div className="mt-3 rounded-lg bg-background px-3 py-2.5">
        <p className="text-xs font-medium text-text">Ne zaman başvurulur?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{inst.whenToContact}</p>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {inst.phone && (
          <a
            href={telUrl(inst.phone)}
            className="flex items-center gap-2 font-medium text-primary hover:underline"
          >
            <Phone className="h-4 w-4" />
            {inst.phone}
          </a>
        )}
        {inst.note && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{inst.note}</span>
          </p>
        )}
      </div>
    </article>
  );
}

export function OfficialInstitutionsPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InstitutionCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFFICIAL_INSTITUTIONS.filter((inst) => {
      if (categoryFilter !== "all" && inst.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.nameDe.toLowerCase().includes(q) ||
        inst.description.toLowerCase().includes(q) ||
        inst.whenToContact.toLowerCase().includes(q)
      );
    });
  }, [query, categoryFilter]);

  const categories = Object.keys(INSTITUTION_CATEGORY_LABELS) as InstitutionCategory[];

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
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Almanya Resmi Kurumlar</h1>
          <p className="mt-1 text-sm text-muted">
            Yabancılar dairesi, kayıt ofisi, iş ajansı ve diğer resmi kurumlar — ne işe yarar, nereye başvurulur
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {OFFICIAL_HOTLINES.map((line) => (
          <div
            key={line.phone}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
          >
            <p className="text-sm font-medium text-text">{line.label}</p>
            <a
              href={telUrl(line.phone)}
              className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
            >
              <Phone className="h-5 w-5" />
              {line.phone}
            </a>
            <p className="mt-1 text-xs text-muted">{line.hours}</p>
            <a
              href={line.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Web sitesi <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs leading-relaxed text-muted">
        <strong className="text-text">Önemli:</strong> Ausländerbehörde, Bürgeramt ve Finanzamt gibi birçok kurum{" "}
        <strong className="text-text">şehir/eyalete göre</strong> değişir. Aşağıdaki rehber kurumların görevlerini
        açıklar; randevu için yaşadığınız şehrin resmi sitesini veya telefon hattını kullanın.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kurum ara (ör. yabancılar, vergi, iş)…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            categoryFilter === "all"
              ? "border-primary bg-primary text-white"
              : "border-border text-muted hover:border-primary hover:text-primary"
          }`}
        >
          Tümü
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              categoryFilter === cat
                ? "border-primary bg-primary text-white"
                : "border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {INSTITUTION_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">{filtered.length} kurum listeleniyor</p>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-muted">Aramanıza uygun kurum bulunamadı.</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((inst) => (
            <InstitutionCard key={inst.id} inst={inst} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
