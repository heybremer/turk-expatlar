"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { api, FederalState } from "@/lib/api";
import { register } from "@/lib/auth";
import type { PostalCountry } from "@/lib/postal-country";
import { COUNTRY_FLAGS, COUNTRY_LABELS } from "@/lib/postal-country";
import { type DePlzResult, resolvePlzFromStates } from "@/lib/postal-plz";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TrPlzResult = {
  found: boolean;
  provinceName?: string | null;
};

function KayitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [states, setStates] = useState<FederalState[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [plzStatus, setPlzStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [plzLabel, setPlzLabel] = useState("");
  const plzTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    postalCountry: "DE" as PostalCountry,
    postalCode: "",
    stateId: "",
    cityId: "",
    gdprConsent: false,
    referralCode: searchParams.get("ref") ?? "",
  });

  useEffect(() => {
    api.get<FederalState[]>("/locations/states").then(setStates).catch(() => {});
  }, []);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setForm((f) => ({ ...f, referralCode: ref }));
  }, [searchParams]);

  useEffect(() => {
    if (form.postalCountry !== "DE" || !form.stateId) {
      if (form.postalCountry !== "DE") setCities([]);
      return;
    }
    const state = states.find((s) => s.id === form.stateId);
    const newCities = state?.cities ?? [];
    setCities(newCities);
    setForm((f) => {
      if (f.cityId && newCities.some((c) => c.id === f.cityId)) return f;
      return { ...f, cityId: "" };
    });
  }, [form.stateId, form.postalCountry, states]);

  function setCountry(country: PostalCountry) {
    setForm((f) => ({
      ...f,
      postalCountry: country,
      postalCode: "",
      stateId: "",
      cityId: "",
    }));
    setPlzStatus("idle");
    setPlzLabel("");
  }

  function handlePostalChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setForm((prev) => ({ ...prev, postalCode: cleaned }));
    setPlzStatus("idle");
    setPlzLabel("");
    if (plzTimer.current) clearTimeout(plzTimer.current);
    if (cleaned.length === 5) {
      setPlzStatus("loading");
      plzTimer.current = setTimeout(
        () => lookupPlz(cleaned, form.postalCountry),
        600,
      );
    }
  }

  async function lookupPlz(code: string, country: PostalCountry) {
    try {
      if (country === "DE") {
        const res = await api.get<DePlzResult>(`/locations/postal/${code}`);
        const resolved = resolvePlzFromStates(res, states);
        if (resolved?.stateId) {
          const matchedState = states.find((s) => s.id === resolved.stateId);
          if (matchedState?.cities?.length) setCities(matchedState.cities);
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
      } else {
        const res = await api.get<TrPlzResult>(`/locations/postal/tr/${code}`);
        if (res.found && res.provinceName) {
          setPlzLabel(res.provinceName);
          setPlzStatus("found");
        } else {
          setPlzStatus("not_found");
        }
      }
    } catch {
      setPlzStatus("not_found");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.gdprConsent) {
      setError("GDPR onayı gerekli");
      return;
    }
    if (!/^\d{5}$/.test(form.postalCode)) {
      setError("Geçerli bir 5 haneli posta kodu girin");
      return;
    }
    if (form.postalCountry === "DE" && (!form.stateId || !form.cityId)) {
      setError("Almanya kaydı için eyalet ve şehir gerekli");
      return;
    }
    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        postalCountry: form.postalCountry,
        postalCode: form.postalCode,
        stateId: form.postalCountry === "DE" ? form.stateId : undefined,
        cityId: form.postalCountry === "DE" ? form.cityId : undefined,
        gdprConsent: form.gdprConsent,
        referralCode: form.referralCode.trim() || undefined,
      });
      router.push("/hosgeldin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-md py-8">
      <h1 className="text-2xl font-bold">Hesap Oluştur</h1>
      <p className="mt-2 text-sm text-muted">
        Almanya&apos;daki Türkçe konuşan topluluğa katıl
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="Ad Soyad"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          required
        />
        <Input
          label="E-posta"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          label="Şifre (min. 8 karakter)"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <Input
          label="Referans kodu (isteğe bağlı)"
          value={form.referralCode}
          onChange={(e) =>
            setForm({ ...form, referralCode: e.target.value.toUpperCase() })
          }
          placeholder="ABC12345"
          maxLength={12}
        />

        <div>
          <label className="block text-sm font-medium">Posta kodu ülkesi</label>
          <div className="mt-1.5 flex gap-2">
            {(["DE", "TR"] as PostalCountry[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCountry(c)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  form.postalCountry === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/40"
                }`}
              >
                <span>{COUNTRY_FLAGS[c]}</span>
                {COUNTRY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium">
            Posta kodu <span className="text-danger">*</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id="postalCode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder={form.postalCountry === "DE" ? "50667" : "34000"}
              value={form.postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              required
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
          {plzStatus === "not_found" && form.postalCountry === "DE" && (
            <p className="mt-1 text-xs text-danger">
              Posta kodu bulunamadı. Eyalet ve şehri aşağıdan manuel seçin.
            </p>
          )}
          {plzStatus === "not_found" && form.postalCountry === "TR" && (
            <p className="mt-1 text-xs text-danger">Geçerli bir Türkiye posta kodu girin.</p>
          )}
          {plzStatus === "idle" && (
            <p className="mt-1 text-xs text-muted">
              {form.postalCountry === "DE"
                ? "5 haneli Almanya posta kodu — eyalet ve şehir otomatik dolar."
                : "5 haneli Türkiye posta kodu. Türkiye kayıtlı üyeler yalnızca izin verilen sayfalara erişebilir."}
            </p>
          )}
        </div>

        {form.postalCountry === "DE" && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="stateId" className="block text-sm font-medium">Eyalet</label>
              <select
                id="stateId"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={form.stateId}
                onChange={(e) =>
                  setForm({ ...form, stateId: e.target.value, cityId: "", postalCode: "" })
                }
                required
              >
                <option value="">Seçin</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cityId" className="block text-sm font-medium">Şehir</label>
              <select
                id="cityId"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={form.cityId}
                onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                required
                disabled={!form.stateId}
              >
                <option value="">Seçin</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.gdprConsent}
            onChange={(e) => setForm({ ...form, gdprConsent: e.target.checked })}
            className="mt-1"
          />
          <span>
            <Link href="/gizlilik" className="text-primary hover:underline">
              Gizlilik politikasını
            </Link>{" "}
            okudum ve kişisel verilerimin işlenmesine onay veriyorum (KVKK/GDPR).
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kayıt Ol"}
        </Button>
      </form>

      {/* Sosyal kayıt */}
      <div className="mt-6">
        <div className="relative flex items-center">
          <div className="flex-1 border-t border-border" />
          <span className="mx-3 text-xs text-muted">veya</span>
          <div className="flex-1 border-t border-border" />
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201"}/api/auth/google`}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-background"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile kayıt ol
        </a>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="text-primary hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}

export default function KayitPage() {
  return (
    <Suspense fallback={<div className="w-full min-w-0 text-muted">Yükleniyor…</div>}>
      <KayitForm />
    </Suspense>
  );
}
