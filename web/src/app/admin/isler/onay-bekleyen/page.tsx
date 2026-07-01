"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type PendingJob = {
  id: string;
  title: string;
  company: string;
  createdAt: string;
  city?: { name: string } | null;
  owner?: { email: string; profile?: { displayName: string } | null };
};

export default function AdminPendingJobsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setItems(await api.get<PendingJob[]>("/admin/jobs/pending", token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setActionId(id);
    try {
      await api.patch(`/admin/jobs/${id}/${action}`, {}, token!);
      setItems((prev) => prev.filter((j) => j.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Briefcase className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Onay Bekleyen İş İlanları</h1>
        <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-sm font-medium text-warning">
          {items.length}
        </span>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-muted">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted">
            Onay bekleyen ilan yok.
          </div>
        ) : (
          items.map((j) => (
            <div key={j.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{j.title}</p>
                    <span className="text-sm text-muted">
                      — {(j as { listingType?: string; company?: string }).listingType === "SEEKER"
                        ? "İş arayan"
                        : j.company ?? "—"}
                    </span>
                    <Link href={`/isler/${j.id}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted hover:text-primary" />
                    </Link>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {j.owner?.profile?.displayName ?? j.owner?.email}
                    {j.city && ` · ${j.city.name}`}
                  </p>
                  <p className="text-xs text-muted">Oluşturuldu: {formatDate(j.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act(j.id, "approve")} disabled={actionId === j.id}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Onayla
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act(j.id, "reject")} disabled={actionId === j.id}>
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Reddet
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
