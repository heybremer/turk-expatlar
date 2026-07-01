"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";

export default function TwoFAPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "setup" | "done">("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json() as { qrDataUrl: string; secret: string };
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep("setup");
    } catch {
      setError("Kurulum başlatılamadı");
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnable() {
    if (code.length !== 6) { setError("6 haneli kod girin"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/2fa/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? "Hata");
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kod geçersiz");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">İki Faktörlü Doğrulama</h1>
      </div>

      {step === "idle" && (
        <Card>
          <p className="text-sm text-muted">
            2FA etkinleştirdiğinizde giriş yaparken Google Authenticator gibi bir uygulama üzerinden
            tek kullanımlık kod girmeniz gerekir.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Google Authenticator, Authy veya benzeri bir uygulama edinin
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              QR kodu tarayın veya gizli anahtarı girin
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Oluşan 6 haneli kodu girerek onaylayın
            </li>
          </ul>
          <Button className="mt-6 w-full" onClick={startSetup} disabled={loading}>
            {loading ? "Hazırlanıyor…" : "2FA Kurulumunu Başlat"}
          </Button>
        </Card>
      )}

      {step === "setup" && (
        <Card className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-medium">1. QR kodu tarayın</p>
            {qrDataUrl && (
              <div className="flex justify-center">
                <Image src={qrDataUrl} alt="2FA QR kodu" width={200} height={200} unoptimized />
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">
              Tarayamıyorsanız bu gizli anahtarı girin:
            </p>
            <code className="block rounded-lg bg-background p-3 font-mono text-xs tracking-widest break-all">
              {secret}
            </code>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">2. Uygulamanın ürettiği kodu girin</p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center tracking-[0.5em] text-lg"
            />
            {error && <p className="mt-1 text-sm text-danger">{error}</p>}
          </div>
          <Button className="w-full" onClick={confirmEnable} disabled={loading || code.length !== 6}>
            {loading ? "Doğrulanıyor…" : "Onayla ve Etkinleştir"}
          </Button>
        </Card>
      )}

      {step === "done" && (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <ShieldCheck className="h-16 w-16 text-success" />
          <h2 className="text-xl font-bold">2FA Etkinleştirildi!</h2>
          <p className="text-muted">
            Artık her girişte kimlik doğrulama uygulamanızdan kod girmeniz gerekecek.
          </p>
          <Button onClick={() => router.push("/profil")} className="mt-2">
            Profile dön
          </Button>
        </Card>
      )}

      <button
        onClick={() => router.back()}
        className="mt-6 flex items-center gap-1 text-sm text-muted hover:text-text"
      >
        <ShieldOff className="h-4 w-4" /> Geri dön
      </button>
    </div>
  );
}
