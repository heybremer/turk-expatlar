"use client";

import Link from "next/link";
import { Lock, MessageCircle, Plus, Trash2, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatAvatar } from "./ChatAvatar";
import { DmEntry, timeAgo } from "./chat-utils";

type Props = {
  dms: DmEntry[];
  loading?: boolean;
  activeUserId?: string;
  onNewMessage?: () => void;
  onDelete?: (chatId: string) => void;
  deletingChatId?: string | null;
};

export function DmConversationList({
  dms,
  loading,
  activeUserId,
  onNewMessage,
  onDelete,
  deletingChatId,
}: Props) {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Özel Mesajlar</span>
        {onNewMessage && (
          <button
            type="button"
            onClick={onNewMessage}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
            title="Yeni mesaj"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-3 py-8 text-center text-sm text-muted">Yükleniyor…</p>}
        {!loading && dms.length === 0 && (
          <div className="px-3 py-8 text-center">
            <UserCircle2 className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-xs text-muted">Henüz mesaj yok</p>
            {onNewMessage && (
              <button
                type="button"
                onClick={onNewMessage}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Yeni mesaj başlat
              </button>
            )}
          </div>
        )}
        {dms.map((dm) => {
          const partnerId = dm.partner?.id;
          if (!partnerId) return null;
          const name = dm.partner?.profile?.displayName ?? "Anonim";
          const avatar = dm.partner?.profile?.avatarUrl;
          const hasUnread = (dm.unread ?? 0) > 0;
          const isActive = activeUserId === partnerId;
          const isDeleting = deletingChatId === dm.chatId;

          return (
            <div
              key={dm.chatId}
              className={cn(
                "group flex items-center gap-1 border-b border-border/50 transition-colors hover:bg-background",
                isActive && "bg-primary/10",
                hasUnread && !isActive && "bg-primary/5",
              )}
            >
              <Link
                href={`/sohbet/dm/${partnerId}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5"
              >
                <ChatAvatar name={name} url={avatar} role={dm.partner?.role} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn("truncate text-sm", hasUnread ? "font-semibold" : "font-medium")}>
                      {name}
                    </p>
                    {dm.lastMessage && (
                      <span className="flex-shrink-0 text-[10px] text-muted">
                        {timeAgo(dm.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {dm.lastMessage ? (
                    <p className="truncate text-xs text-muted">{dm.lastMessage.body}</p>
                  ) : (
                    <p className="text-xs italic text-muted">Henüz mesaj yok</p>
                  )}
                </div>
                {hasUnread && (
                  <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {(dm.unread ?? 0) > 9 ? "9+" : dm.unread}
                  </span>
                )}
              </Link>
              {onDelete && (
                <button
                  type="button"
                  title="Sohbeti sil"
                  disabled={isDeleting}
                  onClick={() => onDelete(dm.chatId)}
                  className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function DmEmptyState({ onNewMessage }: { onNewMessage?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-background p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <MessageCircle className="h-8 w-8 text-primary" />
      </div>
      <p className="mt-4 font-semibold">Özel mesajlarınız</p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Sol listeden bir konuşma seçin veya yeni bir mesaj başlatın.
      </p>
      {onNewMessage && (
        <button
          type="button"
          onClick={onNewMessage}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Yeni Mesaj
        </button>
      )}
    </div>
  );
}
