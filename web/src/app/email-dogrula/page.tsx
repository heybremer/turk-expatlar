"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Geçersiz bağlantı.");
      return;
    }

    fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("success");
          setMessage((body as { message?: string }).message ?? "E-posta doğrulandı.");
          // 3 saniye sonra akış sayfasına yönlendir
          setTimeout(() => router.push("/akis"), 3000);
        } else {
          setStatus("error");
          setMessage((body as { message?: string }).message ?? "Bağlantı geçersiz veya süresi dolmuş.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      });
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 text-muted">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Doğrulanıyor…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" />
        <h1 className="text-2xl font-bold">E-posta Doğrulandı!</h1>
        <p className="text-muted">{message}</p>
        <p className="text-sm text-muted">Ana sayfaya yönlendiriliyorsunuz…</p>
        <Link
          href="/akis"
          className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Hemen git →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <XCircle className="h-14 w-14 text-danger" />
      <h1 className="text-2xl font-bold">Doğrulama Başarısız</h1>
      <p className="max-w-xs text-muted">{message}</p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/akis"
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
        >
          Ana sayfaya dön
        </Link>
        <Link
          href="/profil"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    </div>
  );
}

export default function EmailDogrulaPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-10 shadow-sm">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
