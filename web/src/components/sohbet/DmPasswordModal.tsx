"use client";

import { useEffect, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  chatId: string | null;
  token: string;
  hasPassword?: boolean;
  onClose: () => void;
  onUpdated?: (hasPassword: boolean) => void;
};

export function DmPasswordModal({ open, chatId, token, hasPassword, onClose, onUpdated }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !chatId) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password && password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    if (password && password.length < 4) {
      setError("Şifre en az 4 karakter olmalı");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/chat/${chatId}/password`, { password: password || undefined }, token);
      onUpdated?.(!!password);
      onClose();
    } catch {
      setError("Şifre kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await api.patch(`/chat/${chatId}/password`, {}, token);
      onUpdated?.(false);
      onClose();
    } catch {
      setError("Şifre kaldırılamadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Sohbet Şifresi</p>
              <p className="text-xs text-muted">Bu özel sohbete erişim şifresi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-background hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? "Yeni şifre (boş bırak = değiştirme)" : "Şifre belirle"}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {password && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {saving ? "Kaydediliyor…" : password ? "Şifreyi Kaydet" : "Kaydet"}
            </button>
            {hasPassword && (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:border-danger hover:text-danger disabled:opacity-40"
              >
                Kaldır
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function DmJoinPasswordModal({
  open,
  roomName,
  onSubmit,
  onClose,
}: {
  open: boolean;
  roomName: string;
  onSubmit: (password: string) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-bold">Şifre Korumalı Sohbet</p>
            <p className="text-sm text-muted">{roomName}</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password.trim()) onSubmit(password.trim());
          }}
          className="space-y-3"
        >
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sohbet şifresini girin…"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
          >
            Gir
          </button>
          <button type="button" onClick={onClose} className="w-full text-center text-sm text-muted hover:text-text">
            ← Geri dön
          </button>
        </form>
      </div>
    </div>
  );
}
