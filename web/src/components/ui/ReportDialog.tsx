"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "./Button";

type ReportTargetType =
  | "FORUM_TOPIC"
  | "FORUM_REPLY"
  | "EVENT"
  | "BUSINESS"
  | "BUSINESS_REVIEW"
  | "MESSAGE"
  | "USER"
  | "JOB_POSTING"
  | "COURIER_REQUEST";

const REASONS = [
  "Spam veya reklam",
  "Hakaret / nefret söylemi",
  "Dolandırıcılık",
  "Yanlış / yanıltıcı bilgi",
  "Kişisel veri paylaşımı",
  "Diğer",
];

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { token } = useAuth();

  async function submit() {
    if (!token) {
      alert("Şikayet etmek için giriş yapmalısınız.");
      return;
    }
    setSending(true);
    try {
      await api.post("/reports", { targetType, targetId, reason, details }, token);
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setDetails("");
      }, 1500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Şikayet gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
        title="Şikayet et"
      >
        <Flag className="h-3.5 w-3.5" />
        Şikayet et
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">İçeriği şikayet et</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <p className="mt-6 text-center text-success">
                Teşekkürler, şikayetiniz moderasyon ekibine iletildi.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">Sebep</label>
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Detay (opsiyonel)</label>
                  <textarea
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    İptal
                  </Button>
                  <Button variant="danger" size="sm" onClick={submit} disabled={sending}>
                    {sending ? "Gönderiliyor..." : "Şikayet et"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
