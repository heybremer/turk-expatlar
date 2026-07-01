"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  Plane,
  ShieldCheck,
  User2,
  XCircle,
} from "lucide-react";
import { api, CourierAcceptance, CourierRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CourierDisclaimer } from "@/components/ui/CourierDisclaimer";
import { ReportButton } from "@/components/ui/ReportDialog";

const directionLabels = {
  DE_TO_TR: "🇩🇪 Almanya → 🇹🇷 Türkiye",
  TR_TO_DE: "🇹🇷 Türkiye → 🇩🇪 Almanya",
};

const paymentLabels = {
  FREE: "Ücretsiz",
  PAID: "Ücretli",
  NEGOTIABLE: "Pazarlığa açık",
};

const statusLabels = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
  EXPIRED: "Süresi doldu",
};

export default function SeyahatDetayPage() {
  const params = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [req, setReq] = useState<CourierRequest | null>(null);
  const [error, setError] = useState("");
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptForm, setAcceptForm] = useState({ message: "", travelDate: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    try {
      const data = await api.get<CourierRequest>(
        `/courier/requests/${params.id}`,
        token,
      );
      setReq(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  }, [params?.id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !req) return;
    setBusy(true);
    try {
      await api.post(
        `/courier/requests/${req.id}/accept`,
        {
          message: acceptForm.message || undefined,
          travelDate: acceptForm.travelDate
            ? new Date(acceptForm.travelDate).toISOString()
            : undefined,
        },
        token,
      );
      setAcceptOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAcceptance(acceptanceId: string) {
    if (!token || !req) return;
    setBusy(true);
    try {
      await api.patch(
        `/courier/requests/${req.id}/confirm/${acceptanceId}`,
        {},
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onaylanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function markComplete() {
    if (!token || !req) return;
    setBusy(true);
    try {
      await api.patch(`/courier/requests/${req.id}/complete`, {}, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!token || !req) return;
    if (!confirm("Talebi iptal etmek istediğinize emin misiniz?")) return;
    setBusy(true);
    try {
      await api.patch(`/courier/requests/${req.id}/cancel`, {}, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (!req) {
    return (
      <div className="w-full min-w-0 py-4 text-center text-muted">
        {error || "Yükleniyor..."}
      </div>
    );
  }

  const isLoggedIn = Boolean(token);
  const isOwner = req.isOwner;
  const alreadyAccepted = Boolean(req.myAcceptance);
  const canAccept =
    isLoggedIn &&
    !isOwner &&
    !alreadyAccepted &&
    req.status === "OPEN" &&
    user?.id !== req.owner?.id;

  return (
    <div className="w-full min-w-0">
      <Link href="/seyahat" className="text-sm text-muted hover:text-primary">
        ← Seyahat sayfasına dön
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="default">{directionLabels[req.direction]}</Badge>
        <Badge
          variant={
            req.paymentType === "FREE"
              ? "success"
              : req.paymentType === "PAID"
                ? "accent"
                : "muted"
          }
        >
          {paymentLabels[req.paymentType]}
          {req.paymentType === "PAID" && req.paymentAmount
            ? ` · ${req.paymentAmount} €`
            : ""}
        </Badge>
        <Badge
          variant={
            req.status === "OPEN"
              ? "success"
              : req.status === "MATCHED"
                ? "accent"
                : "muted"
          }
        >
          {statusLabels[req.status]}
        </Badge>
      </div>

      <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold">
        <Package className="h-6 w-6 text-muted" />
        {req.itemName}
      </h1>

      <Card className="mt-6 space-y-3">
        <p className="flex items-center gap-2 text-sm">
          <Plane className="h-4 w-4 text-muted" />
          <span className="font-medium">{req.fromArea}</span>
          <span className="text-muted">→</span>
          <span className="font-medium">{req.toArea}</span>
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {req.weightKg && (
            <div>
              <p className="text-xs text-muted">Ağırlık</p>
              <p className="font-medium">{req.weightKg} kg</p>
            </div>
          )}
          {req.estimatedValueEur && (
            <div>
              <p className="text-xs text-muted">Tahmini değer</p>
              <p className="font-medium">~{req.estimatedValueEur} €</p>
            </div>
          )}
          {req.preferredDate && (
            <div>
              <p className="text-xs text-muted">Tercih edilen tarih</p>
              <p className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(req.preferredDate)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted">Kategori</p>
            <p className="font-medium">{req.itemCategory}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Sahip</p>
            <p className="flex items-center gap-1 font-medium">
              <User2 className="h-3.5 w-3.5" />
              {req.owner?.profile?.displayName ?? "Anonim"}
            </p>
          </div>
        </div>

        {req.notes && (
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm">
            {req.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {canAccept && (
            <Button onClick={() => setAcceptOpen(true)}>
              <ShieldCheck className="mr-1 h-4 w-4" />
              Ben taşıyabilirim
            </Button>
          )}
          {alreadyAccepted && (
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant={
                  req.myAcceptance!.status === "CONFIRMED"
                    ? "success"
                    : req.myAcceptance!.status === "DECLINED"
                      ? "muted"
                      : "default"
                }
              >
                Teklifin: {req.myAcceptance!.status}
              </Badge>
            </div>
          )}
          {isOwner && req.status === "MATCHED" && (
            <Button variant="secondary" onClick={markComplete} disabled={busy}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Tamamlandı olarak işaretle
            </Button>
          )}
          {isOwner && req.status === "OPEN" && (
            <Button variant="ghost" onClick={cancel} disabled={busy}>
              Talebi iptal et
            </Button>
          )}
          <div className="ml-auto">
            <ReportButton targetType="COURIER_REQUEST" targetId={req.id} />
          </div>
        </div>
      </Card>

      {acceptOpen && (
        <Card className="mt-4">
          <h3 className="font-semibold">Teklifini gönder</h3>
          <p className="mt-1 text-sm text-muted">
            Talep sahibine kendini tanıt ve seyahat tarihini paylaş. Sahip onay
            verirse iletişim DM üzerinden devam eder.
          </p>
          <form onSubmit={submitAccept} className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium">
                Seyahat tarihim (ops.)
              </label>
              <input
                type="date"
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={acceptForm.travelDate}
                onChange={(e) =>
                  setAcceptForm({ ...acceptForm, travelDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Mesaj (ops.)</label>
              <textarea
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Merhaba, 14 Haziran&apos;da Köln-İstanbul uçuyorum. Eşyayı şehir merkezinden teslim alabilirim."
                value={acceptForm.message}
                onChange={(e) =>
                  setAcceptForm({ ...acceptForm, message: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                Teklifi gönder
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAcceptOpen(false)}
              >
                Vazgeç
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isOwner && req.acceptances && req.acceptances.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold">
            Gelen teklifler ({req.acceptances.length})
          </h2>
          <div className="mt-3 space-y-2">
            {req.acceptances.map((a: CourierAcceptance) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <User2 className="h-4 w-4 text-muted" />
                      {a.traveler?.profile?.displayName ?? "Anonim"}
                      <Badge
                        variant={
                          a.status === "CONFIRMED"
                            ? "success"
                            : a.status === "DECLINED"
                              ? "muted"
                              : "default"
                        }
                      >
                        {a.status}
                      </Badge>
                    </p>
                    {a.travelDate && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                        <Calendar className="h-3.5 w-3.5" />
                        Seyahat: {formatDate(a.travelDate)}
                      </p>
                    )}
                    {a.message && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-background p-2 text-sm">
                        {a.message}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                  {a.status === "PENDING" && req.status === "OPEN" && (
                    <Button
                      size="sm"
                      onClick={() => confirmAcceptance(a.id)}
                      disabled={busy}
                    >
                      Bu kişiyle eşleş
                    </Button>
                  )}
                  {a.status === "DECLINED" && (
                    <XCircle className="h-5 w-5 text-muted" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <CourierDisclaimer />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
