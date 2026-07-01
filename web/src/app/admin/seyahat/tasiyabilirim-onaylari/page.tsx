"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Loader2, Plane, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminUi";

type UserBrief = {
  id: string;
  email: string;
  profile?: { displayName: string; trustScore?: number } | null;
};

type CarryRelation = {
  id: string;
  status: string;
  message?: string | null;
  travelDate?: string | null;
  createdAt: string;
  traveler?: UserBrief | null;
  request?: {
    id: string;
    itemName: string;
    fromArea: string;
    toArea: string;
    direction: string;
    status: string;
    owner?: UserBrief | null;
  } | null;
};

type Response = {
  items: CarryRelation[];
  total: number;
  page: number;
  totalPages: number;
};

const DIRECTION_LABELS: Record<string, string> = {
  DE_TO_TR: "DE → TR",
  TR_TO_DE: "TR → DE",
};

function relationPhase(row: CarryRelation): string {
  if (row.status === "PENDING") return "Teklif bekliyor";
  if (row.request?.status === "COMPLETED") return "Tamamlandı";
  if (row.request?.status === "MATCHED") return "Eşleşti";
  return "Onaylandı";
}

function phaseBadgeClass(phase: string): string {
  if (phase === "Teklif bekliyor") return "bg-amber-500/10 text-amber-600";
  if (phase === "Eşleşti") return "bg-primary/10 text-primary";
  if (phase === "Tamamlandı") return "bg-emerald-500/10 text-emerald-600";
  return "bg-background text-muted";
}

function displayName(u?: UserBrief | null) {
  return u?.profile?.displayName ?? u?.email ?? "—";
}

export default function AdminTasiyabilirimOnaylariPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Response | null>(null);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (phaseFilter) params.set("phase", phaseFilter);
      setData(await api.get<Response>(`/admin/courier/carry-relations?${params}`, token));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, phaseFilter]);

  useEffect(() => { void load(); }, [load]);

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <Plane className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Taşıyabilirim Onayları</h1>
        {data && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
            {data.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Kim kimin eşyasını taşıyacak — eşya sahibi ve taşıyıcı eşleşmeleri
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Eşya sahibi, taşıyıcı veya eşya ara…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={phaseFilter}
          onChange={(e) => { setPhaseFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Tüm eşleşmeler</option>
          <option value="pending">Teklif bekleyen</option>
          <option value="matched">Eşleşmiş</option>
          <option value="completed">Tamamlanan</option>
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Eşya sahibi</th>
              <th className="px-2 py-3 text-center" aria-hidden />
              <th className="px-4 py-3">Taşıyıcı</th>
              <th className="px-4 py-3">Eşya / Güzergah</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Seyahat</th>
              <th className="px-4 py-3">Teklif tarihi</th>
              <th className="px-4 py-3 text-right">Talep</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted">
                  Taşıma eşleşmesi bulunamadı
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const owner = row.request?.owner;
                const traveler = row.traveler;
                const phase = relationPhase(row);

                return (
                  <tr key={row.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{displayName(owner)}</p>
                      <p className="text-xs text-muted">{owner?.email}</p>
                      {owner?.profile?.trustScore != null && (
                        <p className="text-xs text-muted">Güven: {owner.profile.trustScore}</p>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5 text-muted">
                        <ArrowRight className="h-4 w-4" />
                        <span className="text-[10px]">taşıyor</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{displayName(traveler)}</p>
                      <p className="text-xs text-muted">{traveler?.email}</p>
                      {traveler?.profile?.trustScore != null && (
                        <p className="text-xs text-muted">Güven: {traveler.profile.trustScore}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.request?.itemName ?? "—"}</p>
                      {row.request && (
                        <p className="text-xs text-muted">
                          {DIRECTION_LABELS[row.request.direction] ?? row.request.direction}
                          {" · "}
                          {row.request.fromArea} → {row.request.toArea}
                        </p>
                      )}
                      {row.message && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{row.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${phaseBadgeClass(phase)}`}>
                        {phase}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.travelDate ? formatDate(row.travelDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {row.request?.id && (
                        <Link
                          href={`/seyahat/${row.request.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:border-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Aç
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <AdminPagination page={page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      )}
    </div>
  );
}
