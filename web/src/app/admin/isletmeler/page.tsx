"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, ExternalLink, Loader2, Pencil, Search, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminModal, AdminPagination } from "@/components/admin/AdminUi";

type Business = {
  id: string;
  name: string;
  description: string;
  status: string;
  searchCount: number;
  averageRating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
  category?: { name: string };
  city?: { name: string };
  state?: { name: string };
  owner?: {
    id: string;
    email: string;
    createdAt: string;
    profile?: { displayName: string } | null;
    subscription?: {
      plan: string;
      startsAt: string;
      expiresAt: string | null;
      status: string;
    } | null;
  } | null;
};

type BusinessesResponse = {
  items: Business[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Onay Bekliyor",
  ACTIVE: "Aktif",
  REJECTED: "Reddedildi",
  SUSPENDED: "Askıda",
};

export default function AdminBusinessesPage() {
  const { token } = useAuth();
  const [data, setData] = useState<BusinessesResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editBiz, setEditBiz] = useState<Business | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      setData(await api.get<BusinessesResponse>(`/admin/businesses?${params}`, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("İşletme silinsin mi?")) return;
    await api.delete(`/admin/businesses/${id}`, token!);
    void load();
  }

  async function saveEdit() {
    if (!editBiz) return;
    await api.patch(`/admin/businesses/${editBiz.id}`, { name: editName, description: editDesc }, token!);
    setEditBiz(null);
    void load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Tüm İşletmeler</h1>
          {data && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">{data.total}</span>}
        </div>
        <Link href="/admin/isletmeler/yeni">
          <Button size="sm">+ İşletme Ekle</Button>
        </Link>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="İşletme ara…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">İşletme</th>
              <th className="px-4 py-3">İşletmeci</th>
              <th className="px-4 py-3">Üyelik</th>
              <th className="px-4 py-3">Arama</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-muted">İşletme bulunamadı</td></tr>
            ) : (
              data?.items.map((b) => (
                <tr key={b.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <p className="font-medium">{b.name}</p>
                      <Link href={`/rehber/${b.id}`} target="_blank">
                        <ExternalLink className="h-3 w-3 text-muted" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted">{b.category?.name}{b.city && ` · ${b.city.name}`}</p>
                    <p className="text-xs text-muted">⭐ {b.averageRating.toFixed(1)} ({b.reviewCount} yorum)</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.owner ? (
                      <>
                        <p>{b.owner.profile?.displayName ?? b.owner.email}</p>
                        <p className="text-muted">Kayıt: {formatDate(b.owner.createdAt)}</p>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.owner?.subscription ? (
                      <>
                        <p>{b.owner.subscription.plan}</p>
                        <p className="text-muted">Başlangıç: {formatDate(b.owner.subscription.startsAt)}</p>
                        <p className="text-muted">
                          Bitiş: {b.owner.subscription.expiresAt ? formatDate(b.owner.subscription.expiresAt) : "—"}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted">Üyelik yok</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{b.searchCount} arama</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-border px-2 py-0.5 text-xs">{STATUS_LABELS[b.status] ?? b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditBiz(b);
                        setEditName(b.name);
                        setEditDesc(b.description);
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && <AdminPagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}

      {editBiz && (
        <AdminModal title="İşletmeyi Düzenle">
          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditBiz(null)}>İptal</Button>
            <Button onClick={() => void saveEdit()}>Kaydet</Button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
