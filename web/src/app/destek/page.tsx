"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  Lightbulb,
  Loader2,
  MessageSquareHeart,
  Send,
  Settings,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CATEGORIES = [
  {
    value: "TECHNICAL",
    label: "Teknik sorun",
    description: "Site hatası, giriş sorunu, yükleme problemi vb.",
    icon: Wrench,
  },
  {
    value: "SUGGESTION",
    label: "Öneri",
    description: "Platformu geliştirmek için fikirleriniz",
    icon: Lightbulb,
  },
  {
    value: "REQUEST",
    label: "İstek",
    description: "Yeni özellik veya içerik talebi",
    icon: MessageSquareHeart,
  },
  {
    value: "COMPLAINT",
    label: "Şikayet",
    description: "Hizmet veya platform deneyiminizle ilgili geri bildirim",
    icon: AlertCircle,
  },
  {
    value: "OTHER",
    label: "Diğer",
    description: "Yukarıdakilere uymayan konular",
    icon: HeartHandshake,
  },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

export default function DestekPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [category, setCategory] = useState<CategoryValue>("SUGGESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) router.push("/giris?redirect=/destek");
  }, [token, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/support", { category, subject, message }, token);
      setSent(true);
      setSubject("");
      setMessage("");
      setCategory("SUGGESTION");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Form gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <PageContainer className="py-16 text-center text-muted">
        Yönlendiriliyorsunuz…
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Destek Formu</h1>
            <p className="mt-2 text-muted leading-relaxed">
              Türk Expatlar&apos;ı birlikte büyütüyoruz. Geri bildirimleriniz bizim için
              çok değerli — teknik sorunları çözmemize, yeni özellikler eklememize ve
              size daha iyi hizmet vermemize yardımcı oluyor. Her mesajınızı dikkatle
              okuyor ve mümkün olan en kısa sürede yanıtlıyoruz.
            </p>
          </div>
        </div>
      </div>

      {sent ? (
        <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-lg font-semibold">Teşekkür ederiz!</h2>
          <p className="mt-2 text-sm text-muted">
            Mesajınız yöneticilere iletildi. Geri dönüşünüz platformu geliştirmemize
            katkı sağlayacak.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button variant="ghost" onClick={() => setSent(false)}>
              Yeni mesaj gönder
            </Button>
            <Link href="/">
              <Button>Ana sayfaya dön</Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-medium">Konu kategorisi</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const selected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-surface hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted"}`} />
                      <span className="font-medium">{cat.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
              Konu başlığı
            </label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kısa ve açıklayıcı bir başlık yazın"
              required
              minLength={5}
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
              Mesajınız
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detaylı anlatın: ne yaşadınız, ne öneriyorsunuz veya ne istiyorsunuz?"
              required
              minLength={20}
              maxLength={5000}
              rows={7}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">En az 20 karakter</p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            <Settings className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Kullanıcı veya içerik şikayetleri için{" "}
              <Link href="/forum" className="text-primary hover:underline">
                ilgili içerikteki şikayet butonunu
              </Link>{" "}
              kullanın. Bu form genel destek, öneri ve platform geri bildirimleri içindir.
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Gönder
          </Button>
        </form>
      )}
    </PageContainer>
  );
}
