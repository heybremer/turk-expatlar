"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Gift,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { api, MySubscription } from "@/lib/api";
import { siteContentClass } from "@/lib/site-layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const USER_FEATURES = [
  "Forum'da sınırsız konu ve yanıt",
  "Etkinliklere RSVP ve takvime ekle",
  "Şehir & eyalet sayfaları",
  "İşletme rehberi",
  "İş ilanları listesi",
  "Seyahat eşya taşıma talepleri",
  "Profil ve tanıtım sayfası",
  "Moderasyon rozeti (ileride)",
];

const BUSINESS_FEATURES = [
  "Kullanıcı üyeliğindeki her şey",
  "İşletme rehberine eklenme (premium konum)",
  "Doğrulanmış işletme rozeti",
  "Ayda 1 reklam postuna 'Öne Çıkan' etiketi",
  "İş ilanlarında Türkçe işveren rozeti",
  "Admin panelinden doğrudan iletişim",
  "Yıllık performans raporu (ileride)",
];

const FREE_FEATURES = [
  "Forum okuma & yanıt",
  "Etkinlikleri görüntüleme",
  "İş ilanlarına bakma",
  "Seyahat taleplerini inceleme",
];

export default function UyelikPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [mySub, setMySub] = useState<MySubscription | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (token) {
      api
        .get<MySubscription>("/subscriptions/me", token)
        .then(setMySub)
        .catch(() => {});
    }
  }, [token]);

  async function applyPromo(plan: "USER_YEARLY" | "BUSINESS_YEARLY") {
    if (!token) {
      router.push("/giris?redirect=/uyelik");
      return;
    }
    if (!promoCode.trim()) {
      setPromoError("Lütfen bir kod girin.");
      return;
    }
    setLoadingPromo(true);
    setPromoError("");
    setPromoSuccess("");
    try {
      const res = await api.post<{ message: string }>(
        "/subscriptions/promo",
        { code: promoCode.trim(), plan },
        token,
      );
      setPromoSuccess(res.message);
      const updated = await api.get<MySubscription>("/subscriptions/me", token);
      setMySub(updated);
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Kod uygulanamadı");
    } finally {
      setLoadingPromo(false);
    }
  }

  async function startCheckout(plan: "USER_YEARLY" | "BUSINESS_YEARLY") {
    if (!token) {
      router.push("/giris?redirect=/uyelik");
      return;
    }
    setLoadingCheckout(plan);
    try {
      const res = await api.post<{ url: string | null; message?: string }>(
        "/subscriptions/checkout",
        { plan },
        token,
      );
      if (res.url) {
        window.location.href = res.url;
      } else {
        alert(
          res.message ??
            "Ödeme sistemi henüz yapılandırılmadı. Stripe anahtarlarınızı .env dosyasına ekleyin.",
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ödeme başlatılamadı");
    } finally {
      setLoadingCheckout(null);
    }
  }

  const isActive = mySub?.isActive;
  const activePlan = mySub?.plan;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background py-16 text-center">
        <div className={siteContentClass}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Lansman dönemi — Özel fiyatlar
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Topluluktan en iyisini al
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
            Yıllık sadece <strong className="text-text">10 €</strong> ile tam
            üyelik, ya da lansman kodun varsa{" "}
            <strong className="text-text">tamamen ücretsiz</strong>.
          </p>
        </div>
      </section>

      {/* Aktif üyelik banner */}
      {mounted && isActive && (
        <div className={`${siteContentClass} mt-8`}>
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-5">
            <BadgeCheck className="h-8 w-8 flex-shrink-0 text-success" />
            <div>
              <p className="font-semibold text-text">
                Aktif üyeliğiniz var —{" "}
                {activePlan === "USER_YEARLY"
                  ? "Kullanıcı"
                  : activePlan === "BUSINESS_YEARLY"
                    ? "İşletme"
                    : "Ücretsiz Promosyon"}{" "}
                Planı
              </p>
              {mySub?.subscription?.expiresAt && (
                <p className="text-sm text-muted">
                  Bitiş:{" "}
                  {new Date(mySub.subscription.expiresAt).toLocaleDateString(
                    "tr-TR",
                  )}
                  {mySub.subscription.promoCode && (
                    <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      {mySub.subscription.promoCode.code}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Planlar */}
      <section className={`${siteContentClass} mt-12`}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Ücretsiz */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface p-8">
            <p className="text-sm font-medium text-muted">Ücretsiz</p>
            <p className="mt-2 text-4xl font-bold">
              0 <span className="text-lg font-normal text-muted">€</span>
            </p>
            <p className="mt-1 text-sm text-muted">Sonsuza kadar</p>
            <ul className="mt-6 flex-1 space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" />
                  {f}
                </li>
              ))}
            </ul>
            {mounted && !isAuthenticated() && (
              <Link href="/kayit" className="mt-8 block">
                <Button variant="outline" className="w-full">
                  Kayıt ol
                </Button>
              </Link>
            )}
          </div>

          {/* Kullanıcı */}
          <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-surface p-8 shadow-lg">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
              En popüler
            </span>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <p className="font-semibold text-primary">Kullanıcı</p>
            </div>
            <p className="mt-2 text-4xl font-bold">
              10 <span className="text-lg font-normal text-muted">€ / yıl</span>
            </p>
            <p className="mt-1 text-sm text-muted">≈ 0,83 € / ay</p>
            <ul className="mt-6 flex-1 space-y-2">
              {USER_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 space-y-2">
              {mounted && isActive && activePlan === "USER_YEARLY" ? (
                <p className="flex items-center justify-center gap-1 text-sm text-success">
                  <BadgeCheck className="h-4 w-4" /> Aktif plan
                </p>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={() => startCheckout("USER_YEARLY")}
                    disabled={!!loadingCheckout}
                  >
                    {loadingCheckout === "USER_YEARLY"
                      ? "Yönlendiriliyor..."
                      : "10 € ile başla →"}
                  </Button>
                  <p className="text-center text-xs text-muted">
                    veya promosyon kodu kullan
                  </p>
                </>
              )}
            </div>
          </div>

          {/* İşletme */}
          <div className="relative flex flex-col rounded-2xl border-2 border-accent/40 bg-surface p-8">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
              İşletmeler için
            </span>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              <p className="font-semibold text-accent">İşletme</p>
            </div>
            <p className="mt-2 text-4xl font-bold">
              50 <span className="text-lg font-normal text-muted">€ / yıl</span>
            </p>
            <p className="mt-1 text-sm text-muted">≈ 4,17 € / ay</p>
            <ul className="mt-6 flex-1 space-y-2">
              {BUSINESS_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 space-y-2">
              {mounted && isActive && activePlan === "BUSINESS_YEARLY" ? (
                <p className="flex items-center justify-center gap-1 text-sm text-success">
                  <BadgeCheck className="h-4 w-4" /> Aktif plan
                </p>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => startCheckout("BUSINESS_YEARLY")}
                    disabled={!!loadingCheckout}
                  >
                    {loadingCheckout === "BUSINESS_YEARLY"
                      ? "Yönlendiriliyor..."
                      : "50 € ile başla →"}
                  </Button>
                  <p className="text-center text-xs text-muted">
                    veya promosyon kodu kullan
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Promosyon Kodu */}
      <section className={`${siteContentClass} mt-12`}>
        <div className="rounded-2xl border border-primary/20 bg-primary/3 p-8">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Promosyon / Davet Kodu</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Lansman kodun varsa (<strong>LAUNCH100</strong> — ilk 100 kişi) buraya gir
            ve 1 yıllık üyeliği ücretsiz kazan.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="LAUNCH100"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-mono tracking-widest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {promoError && (
            <p className="mt-2 text-sm text-danger">{promoError}</p>
          )}
          {promoSuccess && (
            <p className="mt-2 flex items-center gap-1 text-sm text-success">
              <Zap className="h-4 w-4" />
              {promoSuccess}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => applyPromo("USER_YEARLY")}
              disabled={loadingPromo}
            >
              {loadingPromo ? "Uygulanıyor..." : "Kullanıcı planına uygula"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => applyPromo("BUSINESS_YEARLY")}
              disabled={loadingPromo}
            >
              İşletme planına uygula
            </Button>
          </div>
        </div>
      </section>

      {/* Güven işaretleri */}
      <section className={`${siteContentClass} mt-12 pb-16`}>
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-6">
            <Shield className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">Güvenli ödeme</p>
            <p className="mt-1 text-sm text-muted">
              Stripe altyapısı, kart bilgileriniz platformda tutulmaz
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <Star className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-3 font-semibold">1 yıllık üyelik</p>
            <p className="mt-1 text-sm text-muted">
              Otomatik yenileme yok, istediğinizde iptal
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <Zap className="mx-auto h-8 w-8 text-accent" />
            <p className="mt-3 font-semibold">Anında aktif</p>
            <p className="mt-1 text-sm text-muted">
              Ödeme onayından saniyeler içinde hesabınıza yansır
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
