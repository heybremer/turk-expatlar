"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminPagination } from "@/components/admin/AdminUi";
import {
  AdminReport,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  ReportsResponse,
  normalizeReportsResponse,
} from "@/components/admin/report-utils";

type Props = {
  title: string;
  statusFilter?: string;
  showResolve?: boolean;
};

export function AdminReportsList({ title, statusFilter, showResolve = false }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      const raw = await api.get<ReportsResponse | AdminReport[]>(`/admin/reports?${params}`, token);
      setData(normalizeReportsResponse(raw, page));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function resolve(id: string) {
    setActionId(id);
    try {
      await api.patch(`/admin/reports/${id}/resolve`, {}, token!);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setActionId(null);
    }
  }

  const items = data?.items ?? [];
  const pendingCount = statusFilter === "PENDING" ? (data?.total ?? 0) : undefined;

  return (
    <div>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h1 className="text-xl font-bold">{title}</h1>
        {pendingCount !== undefined && (
          <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-sm font-medium text-warning">
            {pendingCount}
          </span>
        )}
        {data && statusFilter !== "PENDING" && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm text-primary">
            {data.total}
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted">
            Şikayet bulunamadı.
          </div>
        ) : (
          items.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              showResolve={showResolve && r.status === "PENDING"}
              resolving={actionId === r.id}
              onResolve={() => void resolve(r.id)}
            />
          ))
        )}
      </div>

      {data && data.totalPages > 1 && (
        <AdminPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPage={setPage}
        />
      )}
    </div>
  );
}

function ReportCard({
  report: r,
  showResolve,
  resolving,
  onResolve,
}: {
  report: AdminReport;
  showResolve: boolean;
  resolving: boolean;
  onResolve: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              {REPORT_TARGET_LABELS[r.targetType] ?? r.targetType}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "PENDING" ? "bg-warning/10 text-warning" : "bg-border text-muted"}`}>
              {REPORT_STATUS_LABELS[r.status] ?? r.status}
            </span>
          </div>
          <p className="mt-2 font-medium text-text">{r.targetLabel ?? r.targetId}</p>
          <p className="mt-1 text-sm text-text">{r.reason}</p>
          {r.details && <p className="mt-1 text-xs text-muted">{r.details}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              Şikayetçi:{" "}
              <strong className="text-text">
                {r.reporter?.profile?.displayName ?? r.reporter?.email ?? "Anonim"}
              </strong>
            </span>
            {r.reportedUserName && (
              <span>
                Şikayet edilen:{" "}
                {r.reportedUserId ? (
                  <Link href={`/kullanici/${r.reportedUserId}`} className="font-medium text-primary hover:underline">
                    {r.reportedUserName}
                  </Link>
                ) : (
                  <strong className="text-text">{r.reportedUserName}</strong>
                )}
              </span>
            )}
            <span>{formatDate(r.createdAt)}</span>
          </div>
        </div>
        {showResolve && (
          <Button size="sm" onClick={onResolve} disabled={resolving}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Çözüldü
          </Button>
        )}
      </div>
    </div>
  );
}
