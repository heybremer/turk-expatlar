"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Shield, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { RESTRICTABLE_PAGES } from "@/lib/page-permissions";
import { CountryFlagBadge } from "@/components/user/CountryFlagBadge";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import { Button } from "@/components/ui/Button";
import type { PostalCountry } from "@/lib/postal-country";

type ConfigResponse = {
  pages: { key: string; label: string }[];
  trDefaultAllowedPages: string[];
  counts: { DE: number; TR: number };
};

type CountryUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  profile?: {
    displayName: string;
    postalCode?: string | null;
    postalCountry?: PostalCountry;
    allowedPages?: string[];
  } | null;
  resolvedAllowedPages?: string[];
};

export default function AdminUserPermissionsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [country, setCountry] = useState<PostalCountry>("TR");
  const [users, setUsers] = useState<CountryUser[]>([]);
  const [defaultPages, setDefaultPages] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<CountryUser | null>(null);
  const [userPages, setUserPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [cfg, list] = await Promise.all([
        api.get<ConfigResponse>("/admin/page-permissions", token),
        api.get<{ items: CountryUser[] }>(
          `/admin/page-permissions/users?country=${country}`,
          token,
        ),
      ]);
      setConfig(cfg);
      setDefaultPages(cfg.trDefaultAllowedPages);
      setUsers(list.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, country]);

  useEffect(() => {
    void load();
  }, [load]);

  function togglePage(pages: string[], key: string, setter: (v: string[]) => void) {
    setter(pages.includes(key) ? pages.filter((p) => p !== key) : [...pages, key]);
  }

  async function saveDefaults() {
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch("/admin/page-permissions/tr-default", { pages: defaultPages }, token);
      setSuccess("Türkiye üyeleri için varsayılan sayfa yetkileri kaydedildi.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function saveUserPermissions() {
    if (!token || !selectedUser) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(
        `/admin/users/${selectedUser.id}/page-permissions`,
        { allowedPages: userPages },
        token,
      );
      setSuccess(`${selectedUser.profile?.displayName} için özel yetkiler kaydedildi.`);
      setSelectedUser(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function resetUserPermissions(userId: string) {
    if (!token) return;
    setSaving(true);
    try {
      await api.delete(`/admin/users/${userId}/page-permissions`, token);
      setSuccess("Kullanıcı varsayılan yetkilere döndürüldü.");
      setSelectedUser(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sıfırlanamadı");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !config) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Kullanıcı Yetkileri</h1>
        <p className="mt-1 text-sm text-muted">
          Posta kodu ülkesine göre üyeleri gruplandırın. Türkiye kayıtlı üyeler yalnızca
          seçilen sayfalara erişebilir.
        </p>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      {success && (
        <p className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{success}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CountryFlagBadge country="DE" />
            <span>Almanya</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{config?.counts.DE ?? 0}</p>
          <p className="text-sm text-muted">Tam site erişimi</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CountryFlagBadge country="TR" />
            <span>Türkiye</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{config?.counts.TR ?? 0}</p>
          <p className="text-sm text-muted">Kısıtlı sayfa erişimi</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Türkiye üyeleri — varsayılan sayfa yetkileri</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Profil, destek ve hoşgeldin sayfaları her zaman açıktır. Aşağıdan ek sayfalar seçin.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESTRICTABLE_PAGES.map((page) => (
            <label
              key={page.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
            >
              <input
                type="checkbox"
                checked={defaultPages.includes(page.key)}
                onChange={() => togglePage(defaultPages, page.key, setDefaultPages)}
              />
              {page.label}
              <span className="text-xs text-muted">{page.key}</span>
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={() => void saveDefaults()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          Varsayılanları Kaydet
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Üye listesi</h2>
          </div>
          <div className="flex gap-2">
            {(["DE", "TR"] as PostalCountry[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCountry(c)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  country === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted"
                }`}
              >
                {c === "DE" ? "🇩🇪 Almanya" : "🇹🇷 Türkiye"}
              </button>
            ))}
          </div>
        </div>

        {country === "DE" ? (
          <p className="mt-4 text-sm text-muted">
            Almanya posta kodlu üyeler tüm sayfalara erişebilir. Liste bilgi amaçlıdır.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Türkiye posta kodlu üyeler için kullanıcı bazında özel yetki tanımlayabilirsiniz.
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4">Üye</th>
                <th className="py-2 pr-4">PLZ</th>
                {country === "TR" && <th className="py-2 pr-4">Yetkiler</th>}
                {country === "TR" && <th className="py-2">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">
                    <UserDisplayName
                      name={u.profile?.displayName ?? "—"}
                      userId={u.id}
                      postalCountry={u.profile?.postalCountry}
                      linkToProfile={false}
                    />
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {u.profile?.postalCode ?? "—"}
                  </td>
                  {country === "TR" && (
                    <td className="py-3 pr-4">
                      {u.profile?.allowedPages?.length ? (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                          Özel ({u.profile.allowedPages.length})
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Varsayılan</span>
                      )}
                    </td>
                  )}
                  {country === "TR" && (
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserPages(
                            u.profile?.allowedPages?.length
                              ? u.profile.allowedPages
                              : u.resolvedAllowedPages ?? defaultPages,
                          );
                        }}
                      >
                        Düzenle
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={country === "TR" ? 4 : 2} className="py-8 text-center text-muted">
                    Üye bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && country === "TR" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              {selectedUser.profile?.displayName} — sayfa yetkileri
            </h3>
            <p className="mt-1 text-sm text-muted">
              Bu kullanıcıya özel yetki tanımlarsanız varsayılan ayarlar geçersiz olur.
            </p>
            <div className="mt-4 grid gap-2">
              {RESTRICTABLE_PAGES.map((page) => (
                <label
                  key={page.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={userPages.includes(page.key)}
                    onChange={() => togglePage(userPages, page.key, setUserPages)}
                  />
                  {page.label}
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => void saveUserPermissions()} disabled={saving}>
                Kaydet
              </Button>
              <Button
                variant="outline"
                onClick={() => void resetUserPermissions(selectedUser.id)}
                disabled={saving}
              >
                Varsayılana Sıfırla
              </Button>
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
