"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Geçersiz bağlantı. Lütfen şifremi unuttum sayfasına gidin.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201"}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { message?: string }).message ?? "Bir hata oluştu");
      }
      setSuccess(true);
      setTimeout(() => router.push("/giris"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-4">
        <p className="font-medium text-success">Şifreniz güncellendi!</p>
        <p className="mt-1 text-sm text-muted">
          3 saniye içinde giriş sayfasına yönlendiriliyorsunuz…
        </p>
        <Link href="/giris" className="mt-3 inline-block text-sm text-primary hover:underline">
          Hemen giriş yap →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium">
          Yeni şifre
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="En az 8 karakter"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          Yeni şifreyi tekrar girin
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Şifreyi tekrar girin"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !token}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Kaydediliyor…" : "Şifremi güncelle"}
      </button>
    </form>
  );
}

export default function SifreSifirlaPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Yeni Şifre Belirle</h1>
        <p className="mt-2 text-sm text-muted">
          Hesabınız için yeni şifrenizi girin.
        </p>

        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-lg bg-surface" />}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/sifre-unuttum" className="text-primary hover:underline">
            Yeni bağlantı iste
          </Link>
        </p>
      </div>
    </div>
  );
}
