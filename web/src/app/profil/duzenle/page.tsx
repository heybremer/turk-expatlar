"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2, MapPin, Save, Upload, User } from "lucide-react";
import { api, FederalState } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import { needsPostalCode } from "@/lib/profile-requirements";
import { type DePlzResult, resolvePlzFromStates } from "@/lib/postal-plz";
import { resolveMediaUrl } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserAvatar } from "@/components/user/UserAvatar";

type UserProfile = {
  profile?: {
    displayName: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    occupation?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    postalCode?: string | null;
    languages?: string[];
    interests?: string[];
    dmEnabled?: boolean;
  } | null;
  email: string;
  phone?: string | null;
};

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const LANGUAGE_OPTIONS = [
  "Türkçe", "Almanca", "İngilizce", "Fransızca", "Arapça", "Kürtçe",
];

const INTEREST_OPTIONS = [
  "Spor", "Müzik", "Sinema", "Seyahat", "Yemek", "Teknoloji",
  "Girişimcilik", "Eğitim", "Sağlık", "Kültür & Sanat",
];

export default function ProfilDuzenlePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Yükleniyor...
      </div>
    }>
      <ProfilDuzenleForm />
    </Suspense>
  );
}

function ProfilDuzenleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postalRequiredParam = searchParams.get("required") === "postal";
  const { token, isAuthenticated, refreshUser, user } = useAuth();
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatarUrl: "",
    bio: "",
    occupation: "",
    stateId: "",
    cityId: "",
    postalCode: "",
    languages: [] as string[],
    interests: [] as string[],
    dmEnabled: true,
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [plzStatus, setPlzStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [plzLabel, setPlzLabel] = useState("");
  const plzTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postalRequired =
    postalRequiredParam || needsPostalCode(user);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/giris"); return; }
    Promise.all([
      api.get<UserProfile>("/users/me", token),
      api.get<FederalState[]>("/locations/states"),
    ])
      .then(([user, sts]) => {
        setStates(sts);
        const p = user.profile;
        if (p) {
          const fallback = splitDisplayName(p.displayName ?? "");
          setForm({
            firstName: p.firstName ?? fallback.firstName,
            lastName: p.lastName ?? fallback.lastName,
            email: user.email ?? "",
            phone: user.phone ?? "",
            avatarUrl: p.avatarUrl ?? "",
            bio: p.bio ?? "",
            occupation: p.occupation ?? "",
            stateId: p.stateId ?? "",
            cityId: p.cityId ?? "",
            postalCode: p.postalCode ?? "",
            languages: p.languages ?? [],
            interests: p.interests ?? [],
            dmEnabled: p.dmEnabled ?? true,
          });
          setAvatarPreview(p.avatarUrl ?? null);
          const found = sts.find((s) => s.id === p.stateId);
          setCities(found?.cities ?? []);
          if (p.postalCode) setPlzStatus("found");
        } else {
          setForm((prev) => ({ ...prev, email: user.email ?? "", phone: user.phone ?? "" }));
        }
      })
      .catch(() => setError("Profil bilgileri yüklenemedi"))
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, router]);

  useEffect(() => {
    const found = states.find((s) => s.id === form.stateId);
    setCities(found?.cities ?? []);
  }, [form.stateId, states]);

  function handlePostalChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setForm((prev) => ({ ...prev, postalCode: cleaned }));
    setPlzStatus("idle");
    setPlzLabel("");

    if (plzTimer.current) clearTimeout(plzTimer.current);
    if (cleaned.length === 5) {
      setPlzStatus("loading");
      plzTimer.current = setTimeout(() => lookupPlz(cleaned), 600);
    }
  }

  async function lookupPlz(code: string) {
    try {
      const res = await api.get<DePlzResult>(`/locations/postal/${code}`);
      const resolved = resolvePlzFromStates(res, states);
      if (resolved?.stateId) {
        const matchedState = states.find((s) => s.id === resolved.stateId);
        if (matchedState?.cities?.length) {
          setCities(matchedState.cities);
        }

        setForm((prev) => ({
          ...prev,
          stateId: resolved.stateId!,
          cityId: resolved.cityId ?? prev.cityId,
        }));

        const cityLabel = resolved.cityName ?? res.localityName ?? "";
        setPlzLabel(
          [res.localityName, resolved.stateName, cityLabel !== res.localityName ? cityLabel : ""]
            .filter(Boolean)
            .join(", "),
        );
        setPlzStatus("found");
      } else {
        setPlzStatus("not_found");
      }
    } catch {
      setPlzStatus("not_found");
    }
  }

  function toggleMulti(key: "languages" | "interests", value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setError("Yalnızca resim dosyası yükleyebilirsiniz");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar en fazla 5 MB olabilir");
      return;
    }
    setAvatarUploading(true);
    setError("");
    try {
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      const res = await api.upload<{ avatarUrl: string }>("/users/me/avatar", file, token);
      setForm((prev) => ({ ...prev, avatarUrl: res.avatarUrl }));
      setAvatarPreview(res.avatarUrl);
      const me = await api.get<AuthUser>("/users/me", token);
      refreshUser(me);
      setSuccess("Avatar güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar yüklenemedi");
      setAvatarPreview(form.avatarUrl || null);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function submitPassword() {
    if (!token) return;

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Yeni şifre en az 8 karakter olmalı");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Yeni şifreler eşleşmiyor");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await api.patch(
        "/users/me/password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token,
      );
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Şifreniz güncellendi.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Şifre güncellenemedi");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError("Ad alanı zorunludur");
      return;
    }
    if (postalRequired) {
      if (!/^\d{5}$/.test(form.postalCode)) {
        setError("Geçerli bir 5 haneli posta kodu girin");
        return;
      }
      if (!form.stateId) {
        setError("Posta kodu için eyalet seçimi gerekli");
        return;
      }
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(
        "/users/me/profile",
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          avatarUrl: form.avatarUrl || undefined,
          bio: form.bio || undefined,
          occupation: form.occupation || undefined,
          stateId: form.stateId || undefined,
          cityId: form.cityId || undefined,
          postalCode: form.postalCode,
          languages: form.languages,
          interests: form.interests,
          dmEnabled: form.dmEnabled,
          ...(postalRequired && { completeOnboarding: true }),
        },
        token,
      );
      const me = await api.get<AuthUser>("/users/me", token);
      refreshUser(me);
      setSuccess("Profil güncellendi.");
      setTimeout(() => {
        if (postalRequired && !me.profile?.onboardingCompletedAt) {
          router.push("/hosgeldin");
        } else if (postalRequired) {
          router.push("/akis");
        } else {
          router.push("/profil");
        }
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Yükleniyor...
      </div>
    );
  }

  return (
    <PageContainer>
      {!postalRequired && (
        <Link href="/profil" className="text-sm text-muted hover:text-primary">
          ← Profile dön
        </Link>
      )}
      {postalRequired && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-text">Posta kodunuzu tamamlayın</p>
          <p className="mt-1 text-muted">
            Google ile kayıt sonrası eyalet ve şehir bilgisi için Almanya posta kodunuz (PLZ) gerekli.
          </p>
        </div>
      )}
      <h1 className="mt-4 text-2xl font-bold">
        {postalRequired ? "Profil bilgilerini tamamla" : "Profili düzenle"}
      </h1>

      <form onSubmit={submit} className="mt-8 space-y-5">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium">Profil fotoğrafı</label>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <UserAvatar
                name={[form.firstName, form.lastName].filter(Boolean).join(" ") || user?.profile?.displayName || "?"}
                avatarUrl={avatarPreview}
                role={user?.role}
                size="xl"
              />
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {avatarUploading ? "Yükleniyor…" : "Fotoğraf seç"}
              </Button>
              <p className="mt-1 text-xs text-muted">JPEG, PNG, WebP veya GIF · max 5 MB</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ad"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <Input
            label="Soyad"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        <Input
          label="E-posta"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <Input
          label="Telefon (ops.)"
          type="tel"
          placeholder="+49 170 1234567"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Şifre değiştir</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Güvenliğiniz için mevcut şifrenizi doğrulayın.
          </p>
          <div className="mt-4 space-y-3">
            <Input
              label="Mevcut şifre"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Yeni şifre"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
              />
              <Input
                label="Yeni şifre (tekrar)"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
              />
            </div>
            <p className="text-xs text-muted">En az 8 karakter</p>
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-success">{passwordSuccess}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
              onClick={() => void submitPassword()}
            >
              {passwordSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Güncelleniyor…
                </>
              ) : (
                "Şifreyi güncelle"
              )}
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Hakkımda (ops.)</label>
          <textarea
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={4}
            placeholder="Kendinizden kısaca bahsedin..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <Input
          label="Meslek / Sektör (ops.)"
          placeholder="Yazılım geliştirici, Öğrenci..."
          value={form.occupation}
          onChange={(e) => setForm({ ...form, occupation: e.target.value })}
        />

        {/* PLZ — eyalet/şehir otomatik doldurur */}
        <div>
          <label className="block text-sm font-medium">
            Posta kodu (PLZ)
            {postalRequired && <span className="text-danger"> *</span>}
            {!postalRequired && (
              <span className="ml-1 font-normal text-muted">— eyaleti ve şehri otomatik doldurur</span>
            )}
          </label>
          <div className="relative mt-1.5">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="z.B. 50667"
              value={form.postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              required={postalRequired}
              className={`w-full rounded-lg border bg-surface px-3 py-2 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                plzStatus === "found"
                  ? "border-success focus:border-success"
                  : plzStatus === "not_found"
                    ? "border-danger focus:border-danger"
                    : "border-border focus:border-primary"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {plzStatus === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted" />
              )}
              {plzStatus === "found" && (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              {plzStatus === "not_found" && (
                <span className="text-xs text-danger">?</span>
              )}
            </div>
          </div>
          {plzStatus === "found" && plzLabel && (
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <MapPin className="h-3 w-3" />
              {plzLabel}
            </p>
          )}
          {plzStatus === "not_found" && (
            <p className="mt-1 text-xs text-danger">
              Posta kodu bulunamadı. Eyalet ve şehri aşağıdan manuel seçin.
            </p>
          )}
          {plzStatus === "idle" && (
            <p className="mt-1 text-xs text-muted">
              5 haneli Almanya posta kodunuzu girin — eyalet ve şehir otomatik dolar.
            </p>
          )}
        </div>

        {/* Eyalet + Şehir (PLZ bulamadıysa veya manuel değiştirmek istiyorsa) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Eyalet</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.stateId}
              onChange={(e) =>
                setForm({ ...form, stateId: e.target.value, cityId: "", postalCode: "" })
              }
            >
              <option value="">—</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Şehir</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.cityId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value })}
              disabled={!form.stateId}
            >
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Diller</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleMulti("languages", l)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  form.languages.includes(l)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">İlgi alanları</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleMulti("interests", i)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  form.interests.includes(i)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-accent"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.dmEnabled}
            onChange={(e) => setForm({ ...form, dmEnabled: e.target.checked })}
          />
          Diğer kullanıcıların bana özel mesaj göndermesine izin ver
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Link href="/profil">
            <Button type="button" variant="ghost">İptal</Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
