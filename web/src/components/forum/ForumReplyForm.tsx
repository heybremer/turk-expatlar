"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  topicId: string;
  token?: string | null;
  value: string;
  onChange: (v: string) => void;
  parentId?: string | null;
  replyToName?: string | null;
  onClearParent: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string;
};

export function ForumReplyForm({
  token,
  value,
  onChange,
  parentId,
  replyToName,
  onClearParent,
  onSubmit,
  submitting,
  error,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {parentId && replyToName && (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
          <span>@{replyToName} yanıtlanıyor</span>
          <button type="button" onClick={onClearParent} className="text-muted hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          token
            ? "Deneyimini paylaş… **kalın**, *italik*, link ve @isim kullanabilirsin"
            : "Cevap yazmak için giriş yapmalısın"
        }
        rows={4}
        disabled={!token}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit(e as unknown as React.FormEvent);
          }
        }}
      />

      <p className="text-xs text-muted">
        Ctrl+Enter ile gönder · Markdown: **kalın**, *italik*, &gt; alıntı · @isim ile etiketle
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!token ? (
        <Link href="/giris">
          <Button type="button">Giriş yap</Button>
        </Link>
      ) : (
        <Button type="submit" disabled={submitting}>
          {submitting ? "Gönderiliyor..." : parentId ? "Yanıt gönder" : "Cevap gönder"}
        </Button>
      )}
    </form>
  );
}
