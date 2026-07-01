"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Briefcase, Building2, Calendar,
  Euro, LayoutDashboard, MessageSquare, RefreshCw, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type MembershipRevenue = {
  userRevenueEur: number;
  businessRevenueEur: number;
  totalRevenueEur: number;
  userPaidCount: number;
  businessPaidCount: number;
  userPriceEur: number;
  businessPriceEur: number;
};

type Dashboard = {
  users: number;
  topics: number;
  events: number;
  businesses: number;
  pendingReports: number;
  pendingEvents: number;
  pendingBusinesses: number;
  pendingJobs: number;
  membershipRevenue: MembershipRevenue;
};

function formatEur(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const QUICK_LINKS = [
  { href: "/admin/kullanicilar", label: "Kullanıcıları Yönet", icon: Users, desc: "Listele, ban, sil" },
  { href: "/admin/etkinlikler", label: "Etkinlikleri Onayla", icon: Calendar, desc: "Onay bekleyenler", pending: "pendingEvents" },
  { href: "/admin/isletmeler", label: "İşletmeleri Onayla", icon: Building2, desc: "Onay bekleyenler", pending: "pendingBusinesses" },
  { href: "/admin/isler/onay-bekleyen", label: "İş İlanları", icon: Briefcase, desc: "Onay bekleyenler", pending: "pendingJobs" },
  { href: "/admin/sikayet/onay-bekleyen", label: "Şikayetler", icon: AlertTriangle, desc: "Bekleyen raporlar", pending: "pendingReports" },
] as const;

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setStats(await api.get<Dashboard>("/admin/dashboard", token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const statCards = stats ? [
    { label: "Kullanıcılar",    value: stats.users,     icon: Users,         href: "/admin/kullanicilar" },
    { label: "Forum Konuları",  value: stats.topics,    icon: MessageSquare, href: "/forum" },
    { label: "Etkinlikler",     value: stats.events,    icon: Calendar,      href: "/admin/etkinlikler" },
    { label: "İşletmeler",      value: stats.businesses,icon: Building2,     href: "/admin/isletmeler" },
  ] : [];

  const pendingCards = stats ? [
    { label: "Bekleyen Şikayet",  value: stats.pendingReports,   icon: AlertTriangle, href: "/admin/sikayet/onay-bekleyen",    warning: true },
    { label: "Onay Bkl. Etkinlik",value: stats.pendingEvents,    icon: Calendar,      href: "/admin/etkinlikler",warning: true },
    { label: "Onay Bkl. İşletme", value: stats.pendingBusinesses,icon: Building2,     href: "/admin/isletmeler", warning: true },
    { label: "Onay Bkl. İlan",    value: stats.pendingJobs,      icon: Briefcase,     href: "/admin/isler/onay-bekleyen",      warning: true },
  ] : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-primary">
          <LayoutDashboard className="h-5 w-5" />
          <h1 className="text-xl font-bold">Dashboard</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger">{error}</p>
      )}

      {loading && !stats ? (
        <p className="mt-8 text-muted text-sm">İstatistikler yükleniyor…</p>
      ) : stats ? (
        <>
          {/* Üyelik geliri */}
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Üyelik Geliri</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <Card className="border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Toplam gelir</p>
                <Euro className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1 text-3xl font-bold text-primary">
                {formatEur(stats.membershipRevenue.totalRevenueEur)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stats.membershipRevenue.userPaidCount + stats.membershipRevenue.businessPaidCount} ücretli üyelik
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Kullanıcı üyeliği</p>
                <Users className="h-4 w-4 text-muted" />
              </div>
              <p className="mt-1 text-3xl font-bold text-text">
                {formatEur(stats.membershipRevenue.userRevenueEur)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stats.membershipRevenue.userPaidCount} ödeme · {stats.membershipRevenue.userPriceEur} €/yıl
              </p>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">İşletme üyeliği</p>
                <Building2 className="h-4 w-4 text-muted" />
              </div>
              <p className="mt-1 text-3xl font-bold text-text">
                {formatEur(stats.membershipRevenue.businessRevenueEur)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stats.membershipRevenue.businessPaidCount} ödeme · {stats.membershipRevenue.businessPriceEur} €/yıl
              </p>
            </Card>
          </div>

          {/* Genel istatistikler */}
          <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted">Genel</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.label} href={c.href}>
                  <Card className="cursor-pointer hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted">{c.label}</p>
                      <Icon className="h-4 w-4 text-muted" />
                    </div>
                    <p className="mt-1 text-3xl font-bold text-primary">{c.value}</p>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Bekleyen işlemler */}
          <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted">Bekleyen İşlemler</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pendingCards.map((c) => {
              const Icon = c.icon;
              const hasPending = c.value > 0;
              return (
                <Link key={c.label} href={c.href}>
                  <Card className={`cursor-pointer transition-colors ${hasPending ? "border-warning/50 bg-warning/5 hover:border-warning" : "hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted">{c.label}</p>
                      <Icon className={`h-4 w-4 ${hasPending ? "text-warning" : "text-muted"}`} />
                    </div>
                    <p className={`mt-1 text-3xl font-bold ${hasPending ? "text-warning" : "text-text"}`}>
                      {c.value}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
