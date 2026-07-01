"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Ban, ChevronLeft, ChevronRight,
  Loader2, MoreVertical, Search, Shield, Trash2, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  bannedUntil?: string | null;
  referralCode?: string | null;
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    postalCountry?: PostalCountry;
  } | null;
  referredBy?: {
    id: string;
    email: string;
    referralCode?: string | null;
    profile?: { displayName: string } | null;
  } | null;
  _count?: { forumTopics: number; forumReplies: number; referrals: number };
};

type UsersResponse = {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "Aktif",    cls: "bg-success/10 text-success" },
  SUSPENDED: { label: "Askıda",   cls: "bg-warning/10 text-warning" },
  BANNED:    { label: "Banlı",    cls: "bg-danger/10 text-danger" },
};

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  ADMIN:         { label: "Admin",       cls: "bg-primary/10 text-primary" },
  MODERATOR:     { label: "Moderatör",  cls: "bg-accent/10 text-accent" },
  USER:          { label: "Kullanıcı",  cls: "bg-border text-muted" },
  BUSINESS_OWNER:{ label: "İşletme",    cls: "bg-success/10 text-success" },
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [banModal, setBanModal] = useState<AdminUser | null>(null);
  const [banDays, setBanDays] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await api.get<UsersResponse>(`/admin/users?${params}`, token);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kullanıcılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  useEffect(() => { void load(); }, [load]);

  async function doAction(
    label: string,
    fn: () => Promise<unknown>,
  ) {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(`${label} başarısız: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    } finally {
      setActionId(null);
      setBanModal(null);
      setConfirmDelete(null);
      setOpenMenu(null);
    }
  }

  function banDuration(): Date | undefined {
    const d = parseInt(banDays);
    if (!d || d <= 0) return undefined;
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Kullanıcılar</h1>
          <p className="text-sm text-muted">{data?.total ?? 0} kayıtlı kullanıcı</p>
        </div>
      </div>

      {/* Arama */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad veya e-posta ara…"
          className="w-full max-w-sm rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger">{error}</p>
      )}

      {/* Tablo */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Referans</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Katkı</th>
              <th className="px-4 py-3">Kayıt</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">Sonuç bulunamadı</td>
              </tr>
            ) : (
              data?.items.map((u) => {
                const statusInfo = STATUS_LABELS[u.status] ?? STATUS_LABELS.ACTIVE;
                const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.USER;
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
                      {u.bannedUntil && (
                        <p className="text-xs text-warning">
                          Ban bitiş: {formatDate(u.bannedUntil)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.referralCode && (
                        <p className="font-mono font-medium text-primary">
                          {u.referralCode}
                        </p>
                      )}
                      {u.referredBy ? (
                        <p className="mt-1 text-muted">
                          ← {u.referredBy.profile?.displayName ?? u.referredBy.email}
                        </p>
                      ) : (
                        <p className="text-muted">—</p>
                      )}
                      {(u._count?.referrals ?? 0) > 0 && (
                        <p className="mt-1 text-muted">
                          {u._count?.referrals} davet
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleInfo.cls}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {u._count?.forumTopics ?? 0} konu · {u._count?.forumReplies ?? 0} cevap
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          if (openMenu === u.id) {
                            setOpenMenu(null);
                            setMenuPos(null);
                          } else {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setMenuPos({
                              top: rect.bottom + window.scrollY + 4,
                              right: window.innerWidth - rect.right,
                            });
                            setOpenMenu(u.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-text"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dropdown portal — tablonun overflow kısıtından kaçar */}
      {openMenu && menuPos && (() => {
        const u = data?.items.find((x) => x.id === openMenu);
        if (!u) return null;
        return createPortal(
          <>
            {/* Backdrop — dışarı tıklayınca kapat */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => { setOpenMenu(null); setMenuPos(null); }}
            />
            <div
              style={{ position: "absolute", top: menuPos.top, right: menuPos.right }}
              className="z-50 w-48 rounded-xl border border-border bg-surface shadow-xl"
            >
              <MenuGroup label="Rol değiştir">
                {["USER", "MODERATOR", "ADMIN"].map((r) => (
                  <MenuButton
                    key={r}
                    icon={Shield}
                    disabled={u.role === r || actionId === u.id}
                    onClick={() => {
                      setActionId(u.id);
                      setOpenMenu(null);
                      setMenuPos(null);
                      void doAction("Rol değiştirme", () =>
                        api.patch(`/admin/users/${u.id}/role`, { role: r }, token!),
                      );
                    }}
                  >
                    {ROLE_LABELS[r]?.label ?? r}
                    {u.role === r && " ✓"}
                  </MenuButton>
                ))}
              </MenuGroup>

              {u.role !== "ADMIN" && (
                <>
                  <MenuGroup label="Ban">
                    {u.status === "SUSPENDED" || u.status === "BANNED" ? (
                      <MenuButton
                        icon={UserCheck}
                        disabled={actionId === u.id}
                        onClick={() => {
                          setActionId(u.id);
                          setOpenMenu(null);
                          setMenuPos(null);
                          void doAction("Ban kaldırma", () =>
                            api.patch(`/admin/users/${u.id}/unban`, {}, token!),
                          );
                        }}
                      >
                        Banı kaldır
                      </MenuButton>
                    ) : (
                      <>
                        <MenuButton
                          icon={Ban}
                          onClick={() => {
                            setBanModal(u);
                            setBanDays("7");
                            setOpenMenu(null);
                            setMenuPos(null);
                          }}
                        >
                          Zamanlı ban
                        </MenuButton>
                        <MenuButton
                          icon={Ban}
                          danger
                          disabled={actionId === u.id}
                          onClick={() => {
                            setActionId(u.id);
                            setOpenMenu(null);
                            setMenuPos(null);
                            void doAction("Kalıcı ban", () =>
                              api.patch(`/admin/users/${u.id}/ban`, {}, token!),
                            );
                          }}
                        >
                          Kalıcı ban
                        </MenuButton>
                      </>
                    )}
                  </MenuGroup>

                  <MenuGroup>
                    <MenuButton
                      icon={Trash2}
                      danger
                      onClick={() => {
                        setConfirmDelete(u);
                        setOpenMenu(null);
                        setMenuPos(null);
                      }}
                    >
                      Hesabı sil
                    </MenuButton>
                  </MenuGroup>
                </>
              )}
            </div>
          </>,
          document.body,
        );
      })()}

      {/* Sayfalama */}
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

      {/* Ban modal */}
      {banModal && (
        <Modal title={`Zamanlı ban: ${banModal.profile?.displayName ?? banModal.email}`}>
          <p className="text-sm text-muted">Kaç gün yasaklanacak?</p>
          <div className="mt-3 flex gap-2">
            {[1, 3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setBanDays(String(d))}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  banDays === String(d)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary"
                }`}
              >
                {d}g
              </button>
            ))}
            <input
              type="number"
              value={banDays}
              onChange={(e) => setBanDays(e.target.value)}
              className="w-16 rounded-lg border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              placeholder="gün"
              min={1}
            />
          </div>
          {banDuration() && (
            <p className="mt-2 text-xs text-muted">
              Bitiş: {banDuration()!.toLocaleDateString("tr-TR")}
            </p>
          )}
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setBanModal(null)}>İptal</Button>
            <Button
              disabled={!banDays || parseInt(banDays) <= 0}
              onClick={() => {
                setActionId(banModal.id);
                void doAction("Ban", () =>
                  api.patch(`/admin/users/${banModal.id}/ban`, {
                    until: banDuration()?.toISOString(),
                  }, token!),
                );
              }}
            >
              <Ban className="mr-1.5 h-4 w-4" />
              Uygula
            </Button>
          </div>
        </Modal>
      )}

      {/* Silme onayı */}
      {confirmDelete && (
        <Modal title="Hesabı sil">
          <p className="text-sm text-text">
            <strong>{confirmDelete.profile?.displayName ?? confirmDelete.email}</strong> kullanıcısının
            hesabı kalıcı olarak silinecek ve verileri anonimleştirilecek.
          </p>
          <p className="mt-2 text-sm text-danger font-medium">Bu işlem geri alınamaz.</p>
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>İptal</Button>
            <Button
              onClick={() => {
                setActionId(confirmDelete.id);
                void doAction("Silme", () =>
                  api.delete(`/admin/users/${confirmDelete.id}`, token!),
                );
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Sil
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Yardımcı bileşenler ───────────────────────────────────────────────────

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function MenuGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-0 py-1">
      {label && <p className="px-3 py-1 text-xs text-muted font-medium">{label}</p>}
      {children}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  onClick,
  disabled,
  danger,
  children,
}: {
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-background disabled:opacity-40 ${
        danger ? "text-danger" : "text-text"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
