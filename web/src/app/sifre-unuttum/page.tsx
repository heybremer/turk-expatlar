"use client";

import { useState } from "react";
import Link from "next/link";
import type { Metadata } from "next";

export default function SifreUnuttumPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201"}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? "Bir hata oluştu");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Şifremi Unuttum</h1>
        <p className="mt-2 text-sm text-muted">
          E-posta adresinizi girin. Şifre sıfırlama bağlantısı göndereceğiz.
        </p>

        {success ? (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/10 px-4 py-4">
            <p className="text-sm font-medium text-success">
              Bağlantı gönderildi!
            </p>
            <p className="mt-1 text-sm text-muted">
              Eğer bu e-posta hesabımızda kayıtlıysa birkaç dakika içinde
              sıfırlama bağlantısı alacaksınız. Spam klasörünüzü de kontrol edin.
            </p>
            <Link
              href="/giris"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              ← Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                E-posta adresi
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ali@example.com"
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
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
            </button>

            <p className="text-center text-sm text-muted">
              Şifrenizi hatırladınız mı?{" "}
              <Link href="/giris" className="text-primary hover:underline">
                Giriş yapın
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
