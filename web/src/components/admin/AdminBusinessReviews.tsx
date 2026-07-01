"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, Pencil, Trash2, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminModal, AdminPagination } from "@/components/admin/AdminUi";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  business?: { id: string; name: string };
  user?: { email: string; profile?: { displayName: string } | null };
};

type ReviewsResponse = {
  items: Review[];
  total: number;
  page: number;
  totalPages: number;
};

export function AdminBusinessReviews({ statusFilter }: { statusFilter?: string }) {
  const { token } = useAuth();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState(5);

  const title = statusFilter === "pending"
    ? "Onay Bekleyen Yorumlar"
    : statusFilter === "approved"
      ? "Onaylanmış Yorumlar"
      : "İşletme Yorumları";

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      setData(await api.get<ReviewsResponse>(`/admin/businesses/reviews?${params}`, token));
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    try {
      await api.patch(`/admin/businesses/reviews/${id}/approve`, {}, token!);
      setData((prev) =>
        prev ? { ...prev, items: prev.items.filter((r) => r.id !== id) } : prev,
      );
      if (statusFilter !== "pending") void load();
    } catch {
      void load();
    }
  }

  async function reject(id: string) {
    await api.patch(`/admin/businesses/reviews/${id}/reject`, {}, token!);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Yorum silinsin mi?")) return;
    await api.delete(`/admin/businesses/reviews/${id}`, token!);
    void load();
  }

  async function saveEdit() {
    if (!editReview) return;
    await api.patch(`/admin/businesses/reviews/${editReview.id}`, {
      comment: editComment,
      rating: editRating,
    }, token!);
    setEditReview(null);
    void load();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">{title}</h1>
        {data && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">{data.total}</span>}
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />
        ) : data?.items.length === 0 ? (
          <p className="py-12 text-center text-muted">Yorum bulunamadı</p>
        ) : (
          data?.items.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.business?.name ?? "—"}</p>
                  <p className="text-sm text-muted">
                    {r.user?.profile?.displayName ?? r.user?.email} · {"⭐".repeat(r.rating)} · {formatDate(r.createdAt)}
                  </p>
                  {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                  {statusFilter === "pending" && (
                    <span className="mt-1 inline-block rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">Onay bekliyor</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {r.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => approve(r.id)}><CheckCircle2 className="mr-1 h-4 w-4" />Onayla</Button>
                      <Button size="sm" variant="ghost" onClick={() => reject(r.id)}><XCircle className="mr-1 h-4 w-4" />Reddet</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditReview(r);
                    setEditComment(r.comment ?? "");
                    setEditRating(r.rating);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {data && <AdminPagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}

      {editReview && (
        <AdminModal title="Yorumu Düzenle">
          <label className="text-sm text-muted">Puan</label>
          <select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} yıldız</option>)}
          </select>
          <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditReview(null)}>İptal</Button>
            <Button onClick={() => void saveEdit()}>Kaydet</Button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
