"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ShieldOff, UserX } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminUi";

type BlockEntry = {
  id: string;
  createdAt: string;
  blocker: {
    id: string;
    email: string;
    profile?: { displayName: string } | null;
  };
  blocked: {
    id: string;
    email: string;
    profile?: { displayName: string } | null;
  };
};

type Response = {
  items: BlockEntry[];
  total: number;
  page: number;
  totalPages: number;
};

function displayName(u: { email: string; profile?: { displayName: string } | null }) {
  return u.profile?.displayName ?? u.email;
}

export default function AdminBlockedUsersPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Response | null>(null);
  const [search, setSearch] = useState("");
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
      setData(await api.get<Response>(`/admin/blocks?${params}`, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { void load(); }, [load]);

  async function removeBlock(id: string) {
    if (!confirm("Engel kaldırılsın mı?")) return;
    setActionId(id);
    try {
      await api.delete(`/admin/blocks/${id}`, token!);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setActionId(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center gap-3">
        <UserX className="h-5 w-5 text-warning" />
        <h1 className="text-xl font-bold">Engellenen Kullanıcılar</h1>
        {data && (
          <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-sm font-medium text-warning">
            {data.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Kullanıcıların birbirini engelleme kayıtları</p>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Engelleyen veya engellenen ara…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Engelleyen</th>
              <th className="px-4 py-3">Engellenen</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted">
                  Engel kaydı yok
                </td>
              </tr>
            ) : (
              items.map((b) => (
                <tr key={b.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <Link href={`/kullanici/${b.blocker.id}`} className="font-medium text-primary hover:underline">
                      {displayName(b.blocker)}
                    </Link>
                    <p className="text-xs text-muted">{b.blocker.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/kullanici/${b.blocked.id}`} className="font-medium text-primary hover:underline">
                      {displayName(b.blocked)}
                    </Link>
                    <p className="text-xs text-muted">{b.blocked.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(b.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionId === b.id}
                      onClick={() => void removeBlock(b.id)}
                    >
                      <ShieldOff className="mr-1.5 h-4 w-4" />
                      Engeli Kaldır
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <AdminPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPage={setPage}
        />
      )}
    </div>
  );
}
