"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { siteContentClass } from "@/lib/site-layout";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

export function EmailVerificationBanner() {
  const { user, token } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Gizli: doğrulanmış, giriş yapmamış veya kapatılmış
  if (!user || !token || user.emailVerified || dismissed) return null;

  async function resend() {
    if (!token) return;
    setSending(true);
    try {
      await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      setSent(true);
    } catch {
      // sessizce geç
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative border-b border-warning/30 bg-warning/10 px-4 py-2.5">
      <div className={`${siteContentClass} flex items-center gap-3`}>
        <Mail className="h-4 w-4 shrink-0 text-warning" />
        <p className="flex-1 text-sm text-warning">
          {sent ? (
            "Doğrulama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin."
          ) : (
            <>
              E-posta adresiniz doğrulanmamış.{" "}
              <button
                onClick={resend}
                disabled={sending}
                className="font-medium underline hover:no-underline disabled:opacity-60"
              >
                {sending ? "Gönderiliyor…" : "Doğrulama e-postası gönder"}
              </button>
            </>
          )}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-warning/70 hover:text-warning"
          aria-label="Kapat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
