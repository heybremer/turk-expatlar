"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plane, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminUi";

type CourierRequestRow = {
  id: string;
  direction: string;
  fromArea: string;
  toArea: string;
  itemName: string;
  itemCategory: string;
  status: string;
  paymentType: string;
  createdAt: string;
  owner?: {
    id: string;
    email: string;
    profile?: { displayName: string } | null;
  } | null;
  _count?: { acceptances: number };
};

type Response = {
  items: CourierRequestRow[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
  EXPIRED: "Süresi doldu",
};

const DIRECTION_LABELS: Record<string, string> = {
  DE_TO_TR: "DE → TR",
  TR_TO_DE: "TR → DE",
};

export default function AdminSeyahatlerPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Response | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      setData(await api.get<Response>(`/admin/courier/requests?${params}`, token));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Bu seyahat talebi silinsin mi?")) return;
    setActionId(id);
    try {
      await api.delete(`/admin/courier/requests/${id}`, token!);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setActionId(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <Plane className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Seyahatler</h1>
        {data && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
            {data.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Tüm eşya taşıma talepleri</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Eşya, güzergah ara…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Eşya / Güzergah</th>
              <th className="px-4 py-3">Sahip</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Teklif</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  Seyahat talebi bulunamadı
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.itemName}</p>
                    <p className="text-xs text-muted">
                      {DIRECTION_LABELS[r.direction] ?? r.direction} · {r.fromArea} → {r.toArea}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{r.owner?.profile?.displayName ?? "—"}</p>
                    <p className="text-xs text-muted">{r.owner?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r._count?.acceptances ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/seyahat/${r.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:border-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Görüntüle
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionId === r.id}
                        onClick={() => void remove(r.id)}
                        className="text-danger hover:text-danger"
                      >
                        {actionId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
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
