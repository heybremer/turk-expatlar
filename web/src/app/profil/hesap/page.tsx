"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, UserX } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChatAvatar } from "@/components/sohbet/ChatAvatar";

type BlockedUser = {
  id: string;
  profile: { displayName: string; avatarUrl?: string | null } | null;
  blockedAt: string;
};

const DELETE_CONFIRM_WORD = "SİL";

export default function HesapPage() {
  const router = useRouter();
  const { token, logout, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [blockedError, setBlockedError] = useState("");
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadBlocked = useCallback(() => {
    if (!token) return;
    setBlockedError("");
    api
      .get<BlockedUser[]>("/users/blocked", token)
      .then(setBlocked)
      .catch(() => setBlockedError("Engellenen kullanıcılar yüklenemedi."));
  }, [token]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/giris");
      return;
    }
    loadBlocked();
  }, [isAuthenticated, router, loadBlocked]);

  async function unblock(userId: string) {
    setUnblockingId(userId);
    try {
      await api.delete(`/users/${userId}/block`, token);
      setBlocked((prev) => prev?.filter((u) => u.id !== userId) ?? null);
    } catch (err) {
      setBlockedError(err instanceof ApiError ? err.message : "Engel kaldırılamadı.");
    } finally {
      setUnblockingId(null);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Hesabın kalıcı olarak silinecek ve bu hesapla tekrar giriş yapamayacaksın. Emin misin?",
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete("/users/me", token);
      logout();
      router.replace("/");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Hesap silinemedi. Tekrar dene.");
      setDeleting(false);
    }
  }

  if (!mounted) return null;

  const canDelete =
    confirmText.trim().toLocaleUpperCase("tr-TR") === DELETE_CONFIRM_WORD && !deleting;

  return (
    <PageContainer>
      <Link
        href="/profil"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Profile dön
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Hesap ve Gizlilik</h1>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <UserX className="h-4 w-4" />
          Engellenen kullanıcılar
        </h2>
        <Card className="mt-3">
          {blockedError && <p className="mb-3 text-sm text-danger">{blockedError}</p>}
          {blocked === null && !blockedError ? (
            <p className="text-sm text-muted">Yükleniyor…</p>
          ) : !blocked?.length ? (
            <p className="text-sm text-muted">Engellediğin kullanıcı yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {blocked.map((entry) => {
                const name = entry.profile?.displayName ?? "Kullanıcı";
                return (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <ChatAvatar name={name} url={entry.profile?.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={unblockingId === entry.id}
                      onClick={() => void unblock(entry.id)}
                    >
                      Engeli kaldır
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-danger">
            <Trash2 className="h-4 w-4" />
            Hesabı sil
          </h2>
          <p className="mt-2 text-sm text-muted">
            Hesabın kapatılır; ad, fotoğraf, biyografi, telefon ve giriş bilgilerin silinir.
            Paylaştığın içerikler &quot;Silinmiş Kullanıcı&quot; adıyla kalabilir. Bu işlem geri
            alınamaz.
          </p>
          <label htmlFor="delete-confirm" className="mt-4 block text-sm font-medium">
            Onaylamak için {DELETE_CONFIRM_WORD} yaz
          </label>
          <Input
            id="delete-confirm"
            className="mt-1.5 max-w-xs"
            value={confirmText}
            autoComplete="off"
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={DELETE_CONFIRM_WORD}
          />
          <Button
            variant="danger"
            className="mt-3"
            disabled={!canDelete}
            loading={deleting}
            onClick={() => void deleteAccount()}
          >
            Hesabımı kalıcı olarak sil
          </Button>
          {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}
        </div>
      </section>
    </PageContainer>
  );
}
