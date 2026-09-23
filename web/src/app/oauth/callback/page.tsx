"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth, type AuthUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { markSessionIndicatorCookie, markStaffPostLoginRedirect, resolvePostLoginRedirect } from "@/lib/post-login-redirect";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const finishLogin = useCallback(
    (user: AuthUser, token: string) => {
      setAuth(user, token);
      markSessionIndicatorCookie();
      if (user.role === "ADMIN" || user.role === "MODERATOR") {
        markStaffPostLoginRedirect();
      }
      router.replace(resolvePostLoginRedirect(user));
    },
    [router, setAuth],
  );

  useEffect(() => {
    // Token URL fragment'inde gelir (#token=...): sunucu loglarına sızmaz.
    // Eski query param yolu geriye dönük uyumluluk için korunur.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const twoFactorTicket = hashParams.get("twofa");
    const token = hashParams.get("token") ?? searchParams.get("token");
    // Token'ı adres çubuğundan ve tarayıcı geçmişinden temizle
    window.history.replaceState(null, "", window.location.pathname);

    if (twoFactorTicket) {
      setTicket(twoFactorTicket);
      return;
    }
    if (!token) {
      router.replace("/giris?error=oauth");
      return;
    }

    // Token ile kullanıcı bilgisini çek ve store'a kaydet
    fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`users/me ${r.status}`);
        return r.json() as Promise<AuthUser>;
      })
      .then((user) => finishLogin(user, token))
      .catch(() => router.replace("/giris?error=oauth"));
  }, [searchParams, router, finishLogin]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || code.length !== 6) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post<{ user: AuthUser; accessToken: string }>(
        "/auth/2fa/google",
        { ticket, code },
      );
      finishLogin(res.user, res.accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kod doğrulanamadı.");
      setSubmitting(false);
    }
  }

  if (ticket) {
    return (
      <form onSubmit={submitCode} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-lg font-semibold text-text">İki aşamalı doğrulama</h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Doğrulama uygulamandaki 6 haneli kodu gir.
        </p>
        <Input
          className="mt-4 text-center text-xl tracking-[0.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
        />
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button type="submit" className="mt-4 w-full" loading={submitting} disabled={code.length !== 6}>
          Doğrula ve giriş yap
        </Button>
        <button
          type="button"
          onClick={() => router.replace("/giris")}
          className="mt-3 w-full text-sm text-muted hover:text-primary"
        >
          Giriş sayfasına dön
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-muted">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p>Giriş yapılıyor…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-primary" />}>
        <OAuthCallbackContent />
      </Suspense>
    </div>
  );
}
