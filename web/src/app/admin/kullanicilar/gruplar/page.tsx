"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plane,
  RefreshCw,
  Users as UsersIcon,
  XCircle,
} from "lucide-react";
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
  isBot: boolean;
  editorTeam?: string | null;
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

type EditorialTask = {
  id: string;
  team: string;
  type: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "DISMISSED";
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  assignedTo?: {
    id: string;
    profile?: { displayName: string } | null;
  } | null;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Aktif", cls: "bg-success/10 text-success" },
  SUSPENDED: { label: "Askıda", cls: "bg-warning/10 text-warning" },
  BANNED: { label: "Banlı", cls: "bg-danger/10 text-danger" },
};

const GROUP_ICONS: Record<string, React.ElementType> = {
  bots: Bot,
  events: CalendarDays,
  guide: BookOpen,
  jobs: Briefcase,
  travel: Plane,
};

const GROUP_TO_TEAM: Record<string, string> = {
  events: "EVENTS",
  guide: "GUIDE",
  jobs: "JOBS",
  travel: "TRAVEL",
};

export default function AdminUserGroupsPage() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<EditorialTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
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

  const loadTasks = useCallback(async () => {
    const team = activeGroup ? GROUP_TO_TEAM[activeGroup] : null;
    if (!token || !team) {
      setTasks([]);
      return;
    }
    setTasksLoading(true);
    try {
      const res = await api.get<{ items: EditorialTask[] }>(
        `/admin/editorial/tasks?team=${team}`,
        token,
      );
      setTasks(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Görevler yüklenemedi");
    } finally {
      setTasksLoading(false);
    }
  }, [token, activeGroup]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  async function scanQueues() {
    if (!token) return;
    setScanning(true);
    setError("");
    try {
      await api.post("/admin/editorial/scan", {}, token);
      await Promise.all([loadGroups(), loadTasks()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kuyruk taranamadı");
    } finally {
      setScanning(false);
    }
  }

  async function updateTask(id: string, status: EditorialTask["status"]) {
    if (!token) return;
    await api.patch(`/admin/editorial/tasks/${id}`, { status }, token);
    await loadTasks();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gruplar</h1>
          <p className="text-sm text-muted">Şeffaf editör ekiplerini ve görev kuyruklarını yönet</p>
        </div>
        <Button variant="ghost" size="sm" disabled={scanning} onClick={() => void scanQueues()}>
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Kuyrukları tara
        </Button>
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
                          isBot={u.isBot}
                          editorTeam={u.editorTeam}
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

      {activeGroup && GROUP_TO_TEAM[activeGroup] && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Ekip görevleri</h2>
              <p className="text-xs text-muted">
                İçerikler otomatik yayınlanmaz; ekip veya admin incelemesi gerekir.
              </p>
            </div>
            <span className="text-xs text-muted">{tasks.length} görev</span>
          </div>

          <div className="mt-3 space-y-2">
            {tasksLoading ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
                Açık görev yok
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{task.title}</p>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted">{task.description}</p>
                    )}
                    {task.assignedTo?.profile?.displayName && (
                      <p className="mt-1 text-xs text-primary">
                        Sorumlu: {task.assignedTo.profile.displayName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={taskHref(task)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10"
                    >
                      İncele <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {task.status !== "DONE" && (
                      <button
                        onClick={() => void updateTask(task.id, "DONE")}
                        className="inline-flex items-center gap-1 rounded-lg border border-success/30 px-2.5 py-1.5 text-xs text-success hover:bg-success/10"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Tamamla
                      </button>
                    )}
                    {task.status !== "DISMISSED" && (
                      <button
                        onClick={() => void updateTask(task.id, "DISMISSED")}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-background"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Kapat
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function taskHref(task: EditorialTask) {
  const routes: Record<string, string> = {
    EVENT: "/admin/etkinlikler/onay-bekleyen",
    JOB: "/admin/isler/onay-bekleyen",
    TRAVEL: "/admin/seyahat/seyahatler",
    COURIER: "/admin/seyahat/tasiyabilirim-onaylari",
    BUSINESS: "/admin/isletmeler",
    GUIDE_WEEK: "/rehber/yeni",
  };
  return routes[task.entityType ?? ""] ?? "/admin";
}

function TaskStatusBadge({ status }: { status: EditorialTask["status"] }) {
  const labels = {
    OPEN: { label: "Açık", cls: "bg-warning/10 text-warning" },
    IN_PROGRESS: { label: "İşlemde", cls: "bg-primary/10 text-primary" },
    DONE: { label: "Tamamlandı", cls: "bg-success/10 text-success" },
    DISMISSED: { label: "Kapatıldı", cls: "bg-border text-muted" },
  };
  const item = labels[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.cls}`}>
      {item.label}
    </span>
  );
}
