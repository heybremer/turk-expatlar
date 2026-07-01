"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot, Calendar, CheckCircle2, Circle, ExternalLink, Loader2,
  Play, RefreshCw, Search, Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type Question = {
  categorySlug: string;
  title: string;
  body: string;
  used: boolean;
};

type RecentTopic = {
  id: string;
  title: string;
  createdAt: string;
  user?: { profile?: { displayName: string } | null };
  category?: { name: string };
};

type BotUser = {
  id: string;
  email: string;
  profile?: { displayName: string } | null;
  _count: { forumTopics: number };
};

type Schedule = { utc: string; de: string };

type DashboardData = {
  totalQuestions: number;
  usedCount: number;
  remainingCount: number;
  categories: string[];
  questions: Question[];
  recentTopics: RecentTopic[];
  bots: BotUser[];
  schedule: Schedule[];
};

const CATEGORY_LABELS: Record<string, string> = {
  "resmi-islemler": "Resmi İşlemler",
  "calisma-hayati": "Çalışma Hayatı",
  "egitim": "Eğitim",
  "konut-ve-yasam": "Konut & Yaşam",
  "saglik": "Sağlık",
  "sosyal-hayat": "Sosyal Hayat",
  "mali-isler": "Mali İşler",
  "aile-ve-cocuklar": "Aile & Çocuklar",
};

function StatCard({ label, value, sub, color }: {
  label: string; value: number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? "text-text"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function ForumBotPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "pending">("all");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await api.get<DashboardData>("/admin/forum-bot/dashboard", token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function triggerPost() {
    if (!token) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await api.post<{ title: string }>("/admin/forum-bot/post-now", {}, token);
      setTriggerMsg({ ok: true, text: `Konu oluşturuldu: "${res.title}"` });
      void load();
    } catch (e) {
      setTriggerMsg({ ok: false, text: e instanceof Error ? e.message : "Hata oluştu" });
    } finally {
      setTriggering(false);
    }
  }

  const filteredQuestions = (data?.questions ?? []).filter((q) => {
    if (filterCat !== "all" && q.categorySlug !== filterCat) return false;
    if (filterStatus === "used" && !q.used) return false;
    if (filterStatus === "pending" && q.used) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return q.title.toLowerCase().includes(s) || q.body.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading && !data) {
    return <div className="flex items-center gap-2 text-muted"><Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Forum Bot Paneli</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button size="sm" onClick={() => void triggerPost()} disabled={triggering}>
            {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Şimdi Paylaş
          </Button>
        </div>
      </div>

      {triggerMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${triggerMsg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {triggerMsg.text}
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Toplam Soru" value={data.totalQuestions} />
          <StatCard label="Son 30 Günde Kullanılan" value={data.usedCount} color="text-primary" sub={`%${Math.round((data.usedCount / data.totalQuestions) * 100)}`} />
          <StatCard label="Kalan (kullanılabilir)" value={data.remainingCount} color="text-success" />
          <StatCard label="Bot Persona" value={data.bots.length} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Günlük Zamanlama */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Günlük Zamanlama</h2>
          </div>
          <div className="space-y-2">
            {data?.schedule.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                <span className="font-medium text-primary">{s.de}</span>
                <span className="text-xs text-muted">UTC {s.utc}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Almanya saatiyle, yaz/kış saatine göre ±1 saat kayabilir.</p>
        </div>

        {/* Bot Personalar */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Bot Personalar</h2>
          </div>
          <div className="space-y-2">
            {data?.bots.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{b.profile?.displayName ?? b.email}</p>
                  <p className="text-xs text-muted">{b.email}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {b._count.forumTopics} konu
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Son Paylaşımlar */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h2 className="font-semibold">Son Paylaşımlar</h2>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data?.recentTopics.length === 0 && (
              <p className="text-xs text-muted text-center py-4">Henüz paylaşım yok</p>
            )}
            {data?.recentTopics.map((t) => (
              <div key={t.id} className="rounded-lg bg-background px-3 py-2">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium line-clamp-2 flex-1">{t.title}</p>
                  <Link href={`/forum/${t.id}`} target="_blank" className="flex-shrink-0 mt-0.5">
                    <ExternalLink className="h-3 w-3 text-muted hover:text-primary" />
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {t.user?.profile?.displayName} · {t.category?.name} · {formatDate(t.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Soru Havuzu */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Soru Havuzu ({data?.totalQuestions ?? 0} soru)</h2>
        </div>
        <div className="flex flex-wrap gap-3 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Soru ara…"
              className="rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none w-60"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            {data?.categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "used" | "pending")}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">Tümü</option>
            <option value="used">Kullanılanlar</option>
            <option value="pending">Bekleyenler</option>
          </select>
          <span className="self-center text-sm text-muted">{filteredQuestions.length} sonuç</span>
        </div>

        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {filteredQuestions.map((q, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 hover:bg-background/50">
              <div className="mt-0.5 flex-shrink-0">
                {q.used
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <Circle className="h-4 w-4 text-muted" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{q.title}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {CATEGORY_LABELS[q.categorySlug] ?? q.categorySlug}
                  </span>
                  {q.used && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">kullanıldı</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted line-clamp-2">{q.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
