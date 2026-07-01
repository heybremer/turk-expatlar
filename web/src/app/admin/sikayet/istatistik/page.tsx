"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  REPORT_TARGET_LABELS,
  complaintScoreColor,
} from "@/components/admin/report-utils";

type TargetStat = {
  targetType: string;
  targetId: string;
  targetLabel: string;
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  totalReports: number;
  pendingReports: number;
  complaintScore: number;
};

type Relationship = {
  reporterId: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  reportCount: number;
  lastReportedAt: string;
};

type StatsResponse = {
  byTarget: TargetStat[];
  relationships: Relationship[];
  totalReports: number;
};

export default function AdminReportStatsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setStats(await api.get<StatsResponse>("/admin/reports/stats", token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
      setStats({ byTarget: [], relationships: [], totalReports: 0 });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Şikayet İstatistiği</h1>
        {stats && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">
            {stats.totalReports} toplam
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Kim kimi şikayet etmiş, hedef başına toplam şikayet ve şikayet puanı
      </p>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="mt-8 flex items-center gap-2 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : stats ? (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-lg font-semibold">Şikayet edilen hedefler</h2>
            <p className="text-sm text-muted">Toplam şikayet sayısı ve şikayet puanı (yüksek = riskli)</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3">Hedef</th>
                    <th className="px-4 py-3">Şikayet edilen kullanıcı</th>
                    <th className="px-4 py-3 text-center">Toplam</th>
                    <th className="px-4 py-3 text-center">Bekleyen</th>
                    <th className="px-4 py-3 text-center">Şikayet puanı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.byTarget.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted">Veri yok</td>
                    </tr>
                  ) : (
                    stats.byTarget.map((t) => (
                      <tr key={`${t.targetType}:${t.targetId}`} className="hover:bg-background/50">
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted">
                            {REPORT_TARGET_LABELS[t.targetType] ?? t.targetType}
                          </span>
                          <p className="font-medium">{t.targetLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          {t.reportedUserId ? (
                            <Link href={`/kullanici/${t.reportedUserId}`} className="text-primary hover:underline">
                              {t.reportedUserName}
                            </Link>
                          ) : (
                            <span className="text-muted">{t.reportedUserName ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{t.totalReports}</td>
                        <td className="px-4 py-3 text-center">{t.pendingReports}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${complaintScoreColor(t.complaintScore)}`}>
                            {t.complaintScore}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Kim kimi şikayet etmiş</h2>
            <p className="text-sm text-muted">Şikayetçi → hedef ilişkileri</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-background text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3">Şikayetçi</th>
                    <th className="px-4 py-3">Şikayet edilen</th>
                    <th className="px-4 py-3">Hedef</th>
                    <th className="px-4 py-3 text-center">Adet</th>
                    <th className="px-4 py-3">Son şikayet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.relationships.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted">Veri yok</td>
                    </tr>
                  ) : (
                    stats.relationships.map((rel) => (
                      <tr key={`${rel.reporterId}:${rel.targetType}:${rel.targetId}`} className="hover:bg-background/50">
                        <td className="px-4 py-3">
                          <Link href={`/kullanici/${rel.reporterId}`} className="font-medium text-primary hover:underline">
                            {rel.reporterName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {rel.reportedUserId ? (
                            <Link href={`/kullanici/${rel.reportedUserId}`} className="text-primary hover:underline">
                              {rel.reportedUserName}
                            </Link>
                          ) : (
                            <span className="text-muted">{rel.reportedUserName ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted">
                            {REPORT_TARGET_LABELS[rel.targetType] ?? rel.targetType}
                          </span>
                          <p className="truncate max-w-[200px]">{rel.targetLabel}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{rel.reportCount}</td>
                        <td className="px-4 py-3 text-xs text-muted">{formatDate(rel.lastReportedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
