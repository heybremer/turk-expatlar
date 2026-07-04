"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { markSessionIndicatorCookie, markStaffPostLoginRedirect, resolvePostLoginRedirect } from "@/lib/post-login-redirect";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();

  useEffect(() => {
    // Token URL fragment'inde gelir (#token=...): sunucu loglarına sızmaz.
    // Eski query param yolu geriye dönük uyumluluk için korunur.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const token = hashParams.get("token") ?? searchParams.get("token");
    if (!token) {
      router.replace("/giris?error=oauth");
      return;
    }
    // Token'ı adres çubuğundan ve tarayıcı geçmişinden temizle
    window.history.replaceState(null, "", window.location.pathname);

    // Token ile kullanıcı bilgisini çek ve store'a kaydet
    fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`users/me ${r.status}`);
        return r.json();
      })
      .then((user) => {
        setAuth(user, token);
        markSessionIndicatorCookie();
        if (user.role === "ADMIN" || user.role === "MODERATOR") {
          markStaffPostLoginRedirect();
        }
        router.replace(resolvePostLoginRedirect(user));
      })
      .catch(() => router.replace("/giris?error=oauth"));
  }, [searchParams, router, setAuth]);

  return (
    <div className="flex flex-col items-center gap-3 text-muted">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p>Giriş yapılıyor…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-primary" />}>
        <OAuthCallbackContent />
      </Suspense>
    </div>
  );
}
