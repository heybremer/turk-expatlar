"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Loader2, Search, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminUi";

type BannedUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  bannedUntil?: string | null;
  profile?: { displayName: string; avatarUrl?: string | null } | null;
};

type Response = {
  items: BannedUser[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, string> = {
  SUSPENDED: "Banlı / Askıda",
  BANNED: "Banlı",
};

export default function AdminBannedUsersPage() {
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
      setData(await api.get<Response>(`/admin/users/banned?${params}`, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { void load(); }, [load]);

  async function unban(id: string) {
    if (!confirm("Ban kaldırılsın mı? Kullanıcı tekrar aktif olur.")) return;
    setActionId(id);
    try {
      await api.patch(`/admin/users/${id}/unban`, {}, token!);
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
        <Ban className="h-5 w-5 text-danger" />
        <h1 className="text-xl font-bold">Banlı Kullanıcılar</h1>
        {data && (
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-sm font-medium text-danger">
            {data.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Askıya alınmış veya banlanmış hesaplar</p>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kullanıcı ara…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Ban bitiş</th>
              <th className="px-4 py-3">Kayıt</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted">
                  Banlı kullanıcı yok
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <Link href={`/kullanici/${u.id}`} className="font-medium text-primary hover:underline">
                      {u.profile?.displayName ?? u.email}
                    </Link>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                      {STATUS_LABELS[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {u.bannedUntil ? formatDate(u.bannedUntil) : "Süresiz"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionId === u.id}
                      onClick={() => void unban(u.id)}
                    >
                      <UserCheck className="mr-1.5 h-4 w-4" />
                      Ban Kaldır
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
