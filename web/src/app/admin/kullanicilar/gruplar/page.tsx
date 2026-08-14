"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Bot, ChevronLeft, ChevronRight, ExternalLink, Loader2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";

type UserGroup = {
  key: string;
  name: string;
  description: string;
  count: number;
};

type GroupUser = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    postalCountry?: PostalCountry;
  } | null;
};

type UsersResponse = {
  items: GroupUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Aktif", cls: "bg-success/10 text-success" },
  SUSPENDED: { label: "Askıda", cls: "bg-warning/10 text-warning" },
  BANNED: { label: "Banlı", cls: "bg-danger/10 text-danger" },
};

const GROUP_ICONS: Record<string, React.ElementType> = {
  bots: Bot,
};

export default function AdminUserGroupsPage() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadGroups = useCallback(async () => {
    if (!token) return;
    setGroupsLoading(true);
    try {
      const res = await api.get<{ groups: UserGroup[] }>("/admin/users/groups", token);
      setGroups(res.groups);
      setActiveGroup((prev) => prev ?? res.groups[0]?.key ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gruplar yüklenemedi");
    } finally {
      setGroupsLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadGroups(); }, [loadGroups]);

  const loadUsers = useCallback(async () => {
    if (!token || !activeGroup) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("group", activeGroup);
      const res = await api.get<UsersResponse>(`/admin/users?${params}`, token);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kullanıcılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, activeGroup, page]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  return (
    <div>
      <div>
        <h1 className="text-xl font-bold">Gruplar</h1>
        <p className="text-sm text-muted">Kullanıcıları özel gruplar halinde yönet</p>
      </div>

      {/* Grup kartları */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groupsLoading ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-muted">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Henüz grup yok
          </div>
        ) : (
          groups.map((g) => {
            const Icon = GROUP_ICONS[g.key] ?? UsersIcon;
            const active = activeGroup === g.key;
            return (
              <button
                key={g.key}
                onClick={() => { setActiveGroup(g.key); setPage(1); }}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    active ? "bg-primary/15 text-primary" : "bg-background text-muted"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted">{g.count} kullanıcı</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">{g.description}</p>
              </button>
            );
          })
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Seçili grubun kullanıcı tablosu */}
      {activeGroup && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Kayıt</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted">Bu grupta kullanıcı yok</td>
                </tr>
              ) : (
                data?.items.map((u) => {
                  const statusInfo = STATUS_LABELS[u.status] ?? STATUS_LABELS.ACTIVE;
                  const name = u.profile?.displayName ?? "—";
                  return (
                    <tr key={u.id} className="hover:bg-background/50">
                      <td className="px-4 py-3">
                        <UserDisplayName
                          name={name}
                          userId={u.id}
                          postalCountry={u.profile?.postalCountry}
                          linkToProfile={false}
                        />
                        <p className="text-xs text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/kullanicilar?search=${encodeURIComponent(u.email)}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Yönet <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted">
            Sayfa {data.page} / {data.totalPages} ({data.total} kullanıcı)
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </Button>
            <Button
              variant="ghost" size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
