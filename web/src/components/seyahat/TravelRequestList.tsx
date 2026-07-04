"use client";

import { useState } from "react";
import { Check, X, Package, Banknote, Clock } from "lucide-react";
import { api, TravelRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Props = {
  announcementId: string;
  requests: TravelRequest[];
  isOwner: boolean;
  onUpdate?: () => void;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  ACCEPTED: { label: "Kabul edildi", className: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  DECLINED: { label: "Reddedildi", className: "text-red-600 bg-red-50 dark:bg-red-900/20" },
  CANCELLED: { label: "İptal edildi", className: "text-muted bg-muted/10" },
};

const PAYMENT_LABEL: Record<string, string> = {
  FREE: "Ücretsiz",
  PAID: "Ücretli",
  NEGOTIABLE: "Pazarlıklı",
};

export function TravelRequestList({ announcementId, requests, isOwner, onUpdate }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function respond(reqId: string, accept: boolean) {
    setLoadingId(reqId);
    setError("");
    try {
      const endpoint = accept ? "accept" : "decline";
      await api.patch(`/travel-announcements/${announcementId}/requests/${reqId}/${endpoint}`, {});
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız oldu, lütfen tekrar deneyin.");
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted">Henüz teklif yok.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {requests.map((req) => {
        const status = STATUS_LABEL[req.status] ?? STATUS_LABEL.PENDING;
        return (
          <div
            key={req.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{req.itemName}</p>
                {req.description && (
                  <p className="mt-0.5 text-sm text-muted line-clamp-2">{req.description}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              {req.weightKg != null && (
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {req.weightKg} kg
                </span>
              )}
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                {PAYMENT_LABEL[req.paymentType] ?? req.paymentType}
                {req.paymentType === "PAID" && req.paymentAmount != null && (
                  <span className="ml-0.5 font-medium text-foreground">
                    ({req.paymentAmount}€)
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(req.createdAt).toLocaleDateString("tr-TR")}
              </span>
            </div>

            {req.notes && (
              <p className="mt-2 text-xs text-muted italic">&ldquo;{req.notes}&rdquo;</p>
            )}

            {isOwner && req.status && (
              <p className="mt-2 text-xs text-muted">
                Gönderen: {req.requester?.profile?.displayName ?? "Kullanıcı"}
              </p>
            )}

            {isOwner && req.status === "PENDING" && (
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="primary"
                  loading={loadingId === req.id}
                  onClick={() => respond(req.id, true)}
                  className="flex-1"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Kabul Et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={loadingId === req.id}
                  onClick={() => respond(req.id, false)}
                  className="flex-1"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Reddet
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
