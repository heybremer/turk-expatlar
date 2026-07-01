"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, CheckCircle2, ExternalLink, Loader2, Pencil, Search, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminModal, AdminPagination } from "@/components/admin/AdminUi";

type AdminEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
  city?: { name: string } | null;
  state?: { name: string } | null;
  organizer?: { email: string; profile?: { displayName: string } | null };
  _count?: { attendees: number };
};

type EventsResponse = {
  items: AdminEvent[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  PENDING_APPROVAL: "Onay Bekliyor",
  PUBLISHED: "Yayında",
  CANCELLED: "İptal",
  COMPLETED: "Tamamlandı",
};

export function AdminEventsList({
  title,
  filter,
  showApprove,
}: {
  title: string;
  filter?: string;
  showApprove?: boolean;
}) {
  const { token } = useAuth();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editEvent, setEditEvent] = useState<AdminEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filter) params.set("filter", filter);
      if (search.trim()) params.set("search", search.trim());
      setData(await api.get<EventsResponse>(`/admin/events?${params}`, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, filter]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    await api.patch(`/admin/events/${id}/approve`, {}, token!);
    void load();
  }

  async function reject(id: string) {
    const reason = window.prompt("Red sebebi (isteğe bağlı):");
    if (reason === null) return; // iptal
    await api.patch(`/admin/events/${id}/reject`, { reason }, token!);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Etkinlik silinsin mi?")) return;
    await api.delete(`/admin/events/${id}`, token!);
    void load();
  }

  async function saveEdit() {
    if (!editEvent) return;
    await api.patch(`/admin/events/${editEvent.id}`, {
      title: editTitle,
      description: editDesc,
      location: editLocation,
    }, token!);
    setEditEvent(null);
    void load();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">{title}</h1>
        {data && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">{data.total}</span>
        )}
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Etkinlik ara…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />
        ) : data?.items.length === 0 ? (
          <p className="py-12 text-center text-muted">Etkinlik bulunamadı</p>
        ) : (
          data?.items.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{ev.title}</p>
                    <span className="rounded-full bg-border px-2 py-0.5 text-xs">{STATUS_LABELS[ev.status] ?? ev.status}</span>
                    <Link href={`/etkinlikler/${ev.id}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted hover:text-primary" />
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{ev.description}</p>
                  <p className="mt-2 text-xs text-muted">
                    {ev.organizer?.profile?.displayName ?? ev.organizer?.email}
                    {ev.city && ` · ${ev.city.name}`} · 📍 {ev.location}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(ev.startsAt)} · {ev._count?.attendees ?? 0} katılımcı
                  </p>
                </div>
                <div className="flex gap-1">
                  {showApprove && ev.status === "PENDING_APPROVAL" && (
                    <>
                      <Button size="sm" onClick={() => approve(ev.id)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Onayla
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => reject(ev.id)} className="text-danger">
                        Reddet
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditEvent(ev);
                    setEditTitle(ev.title);
                    setEditDesc(ev.description);
                    setEditLocation(ev.location);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(ev.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {data && <AdminPagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}

      {editEvent && (
        <AdminModal title="Etkinliği Düzenle">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Başlık" />
          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Açıklama" />
          <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Konum" />
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditEvent(null)}>İptal</Button>
            <Button onClick={() => void saveEdit()}>Kaydet</Button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
