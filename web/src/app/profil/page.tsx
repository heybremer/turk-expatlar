"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  Copy,
  Gift,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  ChevronRight,
} from "lucide-react";
import { api, MySubscription } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChatAvatar } from "@/components/sohbet/ChatAvatar";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import { LevelCard } from "@/components/user/LevelCard";
import type { PostalCountry } from "@/lib/postal-country";
import { formatDate } from "@/lib/utils";

type ReferralInfo = {
  referralCode: string | null;
  referralCount: number;
  referredBy?: {
    id: string;
    referralCode: string | null;
    profile?: { displayName: string; postalCountry?: PostalCountry | null } | null;
  } | null;
  referrals: {
    id: string;
    email: string;
    createdAt: string;
    profile?: { displayName: string; postalCountry?: PostalCountry | null } | null;
  }[];
};

const PLAN_LABELS = {
  USER_YEARLY: { label: "Kullanıcı Planı", icon: Users, color: "text-primary" },
  BUSINESS_YEARLY: { label: "İşletme Planı", icon: Building2, color: "text-accent" },
  FREE_PROMO: { label: "Promosyon Üyeliği", icon: Gift, color: "text-success" },
};

export default function ProfilPage() {
  const router = useRouter();
  const { user, token, logout, isAuthenticated, refreshUser } = useAuth();
  const [mySub, setMySub] = useState<MySubscription | null>(null);
  const [referrals, setReferrals] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/giris");
      return;
    }
    if (token) {
      api
        .get<AuthUser>("/users/me", token)
        .then((me) => refreshUser(me))
        .catch(() => {});
      api
        .get<MySubscription>("/subscriptions/me", token)
        .then(setMySub)
        .catch(() => {});
      api
        .get<ReferralInfo>("/users/me/referrals", token)
        .then(setReferrals)
        .catch(() => {});
    }
  }, [token, isAuthenticated, router, refreshUser]);

  async function copyReferralLink() {
    if (!referrals?.referralCode) return;
    const link = `${window.location.origin}/kayit?ref=${referrals.referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!referrals?.referralCode) return;
    const link = `${window.location.origin}/kayit?ref=${referrals.referralCode}`;
    const text = encodeURIComponent(
      `Türk Expatlar'a katıl — Almanya'daki Türkçe topluluk platformu. Davet kodum: ${referrals.referralCode}\n${link}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  if (!mounted) return null;

  const planInfo = mySub?.plan ? PLAN_LABELS[mySub.plan] : null;
  const PlanIcon = planInfo?.icon;

  // Profil tamamlama adımları
  const completionSteps = [
    { key: "avatar", label: "Profil fotoğrafı ekle", done: !!user?.profile?.avatarUrl, href: "/profil/duzenle" },
    { key: "city", label: "Şehir bilgisi ekle", done: !!user?.profile?.cityId, href: "/profil/duzenle" },
    { key: "interests", label: "İlgi alanlarını belirle", done: (user?.profile?.interests?.length ?? 0) > 0, href: "/profil/duzenle" },
    { key: "email", label: "E-posta adresini doğrula", done: !!user?.emailVerified, href: "/profil" },
    { key: "post", label: "İlk forum konunu aç", done: false, href: "/forum/yeni" },
  ];
  const completedCount = completionSteps.filter((s) => s.done).length;
  const completionPercent = Math.round((completedCount / completionSteps.length) * 100);

  return (
    <PageContainer>
      {/* Referans davet bandı */}
      {referrals?.referralCode && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Gift className="h-4 w-4" />
                Arkadaşını davet et
              </p>
              <p className="mt-1 text-sm text-muted">
                Kodunla kayıt olanlar senin referansın olur. Toplam:{" "}
                <strong>{referrals.referralCount}</strong> kişi
              </p>
              <p className="mt-2 font-mono text-xl font-bold tracking-wider text-primary">
                {referrals.referralCode}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyReferralLink}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" />
                    Linki kopyala
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={shareWhatsApp}>
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profil tamamlama göstergesi — %100 olunca gizle */}
      {completionPercent < 100 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Profil Tamamlanma</p>
              <p className="mt-0.5 text-xs text-muted">
                {completedCount}/{completionSteps.length} adım tamamlandı
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{completionPercent}%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <ul className="mt-4 space-y-2">
            {completionSteps.map((step) => (
              <li key={step.key}>
                <a
                  href={step.href}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-success/15 text-success" : "bg-border text-muted"}`}>
                    {step.done ? <Check className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                  <span className={step.done ? "text-muted line-through" : "text-text"}>
                    {step.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Başlık */}
      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profilim</h1>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Çıkış yap
        </Button>
      </div>

      {/* Kullanıcı bilgileri */}
      <Card className="mt-6">
        <div className="flex items-start gap-4">
          <ChatAvatar
            name={user?.profile?.displayName ?? user?.email ?? "?"}
            url={user?.profile?.avatarUrl}
            role={user?.role}
            size="xl"
          />
          <div className="flex-1">
            <UserDisplayName
              name={user?.profile?.displayName ?? "—"}
              postalCountry={user?.profile?.postalCountry as PostalCountry | undefined}
              linkToProfile={false}
              nameClassName="font-semibold"
            />
            <p className="text-sm text-muted">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="muted">{user?.role ?? "USER"}</Badge>
              {mySub?.isActive && (
                <Badge variant="default">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              )}
              {user?.levelProgress && <LevelCard levelProgress={user.levelProgress} compact />}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/profil/2fa">
              <Button variant="ghost" size="sm" title="İki Faktörlü Doğrulama">
                <ShieldCheck className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/profil/duzenle">
              <Button variant="outline" size="sm">
                <Settings className="mr-1 h-3.5 w-3.5" />
                Düzenle
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Seviye ve puan */}
      {user?.levelProgress && (
        <div className="mt-6">
          <h2 className="font-semibold">Seviyem</h2>
          <div className="mt-3">
            <LevelCard levelProgress={user.levelProgress} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Forum konusu açarak (+5), cevap yazarak (+3), etkinlik oluşturarak (+10) ve
            etkinliklere katılarak (+5) puan kazanırsın. Etkinlik gerçekleştiğinde
            organizatöre +100, katılımcılara +75 bonus puan verilir.
          </p>
        </div>
      )}

      {/* Üyelik durumu */}
      <div className="mt-6">
        <h2 className="font-semibold">Üyelik</h2>
        {mySub?.isActive && mySub.subscription ? (
          <Card className="mt-3">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-success" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {PlanIcon && (
                    <PlanIcon
                      className={`h-4 w-4 ${planInfo?.color ?? ""}`}
                    />
                  )}
                  <p className="font-medium">
                    {planInfo?.label ?? mySub.plan}
                  </p>
                </div>
                {mySub.subscription.expiresAt && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    Bitiş:{" "}
                    {new Date(mySub.subscription.expiresAt).toLocaleDateString(
                      "tr-TR",
                    )}
                  </p>
                )}
                {mySub.subscription.promoCode && (
                  <p className="mt-1 text-sm text-muted">
                    Kod:{" "}
                    <span className="font-mono font-medium text-primary">
                      {mySub.subscription.promoCode.code}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mt-3">
            <p className="text-sm text-muted">
              Henüz aktif bir üyeliğiniz yok.
            </p>
            <Link href="/uyelik" className="mt-3 inline-block">
              <Button size="sm">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Üyelik planlarına bak
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Referans kodu */}
      <div className="mt-6">
        <h2 className="font-semibold">Referans Kodun</h2>
        <Card className="mt-3">
          {referrals?.referralCode ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">Arkadaşlarını davet et</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-primary">
                    {referrals.referralCode}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={copyReferralLink}>
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Linki kopyala
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted">
                Bu kodla kayıt olan kişiler senin referansın olarak görünür.
                Toplam: <strong>{referrals.referralCount}</strong> kişi
              </p>
              {referrals.referredBy && (
                <p className="mt-2 text-sm text-muted">
                  Seni davet eden:{" "}
                  <UserDisplayName
                    name={referrals.referredBy.profile?.displayName ?? "—"}
                    userId={referrals.referredBy.id}
                    postalCountry={referrals.referredBy.profile?.postalCountry}
                    linkToProfile={false}
                    nameClassName="font-medium"
                  />
                  {referrals.referredBy.referralCode && (
                    <span className="ml-1 font-mono text-primary">
                      ({referrals.referredBy.referralCode})
                    </span>
                  )}
                </p>
              )}
              {referrals.referrals.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <UserPlus className="h-4 w-4" />
                    Referansınla gelenler
                  </p>
                  <ul className="space-y-2">
                    {referrals.referrals.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                      >
                        <UserDisplayName
                          name={r.profile?.displayName ?? r.email}
                          userId={r.id}
                          postalCountry={r.profile?.postalCountry}
                          linkToProfile={false}
                        />
                        <span className="text-xs text-muted">
                          {formatDate(r.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Referans kodun yükleniyor…</p>
          )}
        </Card>
      </div>

      {/* Hızlı linkler */}
      <div className="mt-6">
        <h2 className="font-semibold">Aktiviteler</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/forum", label: "Forum konularım" },
            { href: "/etkinlikler", label: "Katıldığım etkinlikler" },
            { href: "/isler", label: "İş ilanlarım" },
            { href: "/seyahat", label: "Taşıma taleplerim" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-3.5 text-sm font-medium hover:border-primary hover:text-primary"
            >
              {l.label}
              <span className="text-muted">→</span>
            </Link>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
