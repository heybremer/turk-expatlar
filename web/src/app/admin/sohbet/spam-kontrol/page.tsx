"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, Search, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminUi";

type Log = {
  id: string;
  reason: string;
  detail?: string | null;
  messageSnippet?: string | null;
  autoBanned: boolean;
  bannedUntil?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    status: string;
    bannedUntil?: string | null;
    profile?: { displayName: string } | null;
  } | null;
  chat?: { id: string; name?: string | null; type: string } | null;
};

type Response = {
  items: Log[];
  total: number;
  page: number;
  totalPages: number;
};

const REASON_LABELS: Record<string, string> = {
  BANNED_WORD: "Yasaklı kelime",
  SOCIAL_MEDIA: "Sosyal medya",
  PHONE_NUMBER: "Telefon numarası",
  SPAM: "Spam",
  RATE_LIMIT: "Hız limiti",
};

const selectCls = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default function AdminSohbetSpamKontrolPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Response | null>(null);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [autoOnly, setAutoOnly] = useState(false);
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
      if (reasonFilter) params.set("reason", reasonFilter);
      if (autoOnly) params.set("autoBannedOnly", "true");
      setData(await api.get<Response>(`/admin/chat/moderation-logs?${params}`, token));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, reasonFilter, autoOnly]);

  useEffect(() => { void load(); }, [load]);

  async function unban(userId: string) {
    if (!token || !confirm("Sohbet yasağı kaldırılsın mı?")) return;
    setActionId(userId);
    try {
      await api.patch(`/admin/chat/spam-unban/${userId}`, {}, token);
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
        <ShieldAlert className="h-5 w-5 text-danger" />
        <h1 className="text-xl font-bold">Spam Kontrol</h1>
        {data && (
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-sm font-medium text-danger">
            {data.total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Moderasyon botunun kaydettiği ihlaller. Aynı yasaklı kelime 2. kez kullanılırsa 1 saat ban uygulanır.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kullanıcı veya mesaj ara…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={reasonFilter}
          onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">Tüm nedenler</option>
          {Object.entries(REASON_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoOnly} onChange={(e) => { setAutoOnly(e.target.checked); setPage(1); }} />
          Sadece otomatik ban
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Neden</th>
              <th className="px-4 py-3">Detay / Mesaj</th>
              <th className="px-4 py-3">Kanal</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-muted">İhlal kaydı yok</td></tr>
            ) : (
              items.map((log) => {
                const isBanned =
                  log.user?.status === "SUSPENDED" ||
                  (log.user?.bannedUntil && new Date(log.user.bannedUntil) > new Date());

                return (
                  <tr key={log.id} className={log.autoBanned ? "bg-danger/5" : undefined}>
                    <td className="px-4 py-3">
                      <p>{log.user?.profile?.displayName ?? "—"}</p>
                      <p className="text-xs text-muted">{log.user?.email}</p>
                      {isBanned && (
                        <span className="mt-1 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          Banlı
                          {log.user?.bannedUntil && ` · ${formatDate(log.user.bannedUntil)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                        {REASON_LABELS[log.reason] ?? log.reason}
                      </span>
                      {log.autoBanned && (
                        <p className="mt-1 text-xs text-danger">Otomatik ban</p>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {log.detail && <p className="text-xs text-muted">{log.detail}</p>}
                      {log.messageSnippet && (
                        <p className="mt-1 line-clamp-2 text-xs">{log.messageSnippet}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {log.chat?.name ?? log.chat?.type ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {log.user?.id && isBanned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionId === log.user.id}
                          onClick={() => void unban(log.user!.id)}
                        >
                          {actionId === log.user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Ban kaldır
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
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
    </div>
  );
}
