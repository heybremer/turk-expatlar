"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LifeBuoy, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminModal, AdminPagination } from "@/components/admin/AdminUi";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  user?: {
    id: string;
    email: string;
    profile?: { displayName: string } | null;
  } | null;
};

type Response = {
  items: Ticket[];
  total: number;
  page: number;
  totalPages: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: "Teknik",
  SUGGESTION: "Öneri",
  REQUEST: "İstek",
  COMPLAINT: "Şikayet",
  OTHER: "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapatıldı",
};

const selectCls = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default function AdminDestekPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Response | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      setData(await api.get<Response>(`/admin/support?${params}`, token));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter, categoryFilter]);

  useEffect(() => { void load(); }, [load]);

  function openTicket(ticket: Ticket) {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setAdminNote(ticket.adminNote ?? "");
  }

  async function saveTicket() {
    if (!token || !selected) return;
    setSaving(true);
    try {
      await api.patch(
        `/admin/support/${selected.id}`,
        { status: editStatus, adminNote },
        token,
      );
      setSelected(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Destek Formları</h1>
        {data && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
            {data.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Kullanıcıların gönderdiği destek ve geri bildirim mesajları</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Konu, mesaj veya kullanıcı ara…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">Tüm kategoriler</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Konu</th>
              <th className="px-4 py-3">Durum</th>
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
                  Destek mesajı yok
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p>{t.user?.profile?.displayName ?? "—"}</p>
                    <p className="text-xs text-muted">{t.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-1 font-medium">{t.subject}</p>
                    <p className="line-clamp-1 text-xs text-muted">{t.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openTicket(t)}>
                      Görüntüle
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <AdminPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPage={setPage}
        />
      )}

      {selected && (
        <AdminModal title="Destek mesajı" onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Gönderen</p>
                <p className="font-medium">{selected.user?.profile?.displayName}</p>
                <p className="text-muted">{selected.user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Kategori</p>
                <p>{CATEGORY_LABELS[selected.category] ?? selected.category}</p>
                <p className="mt-2 text-xs text-muted">Gönderim</p>
                <p>{formatDate(selected.createdAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted">Konu</p>
              <p className="font-medium">{selected.subject}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Mesaj</p>
              <p className="whitespace-pre-wrap rounded-lg bg-background p-3">{selected.message}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted">Durum</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className={`${selectCls} w-full`}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted">Admin notu (iç kullanım)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="İç not…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>İptal</Button>
              <Button disabled={saving} onClick={() => void saveTicket()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
