"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, FileText, Reply, SmilePlus, Trash2 } from "lucide-react";
import { ChatAvatar } from "@/components/sohbet/ChatAvatar";
import { ChatReactionBar } from "@/components/sohbet/ChatReactionBar";
import { CountryFlagBadge } from "@/components/user/CountryFlagBadge";
import type { PostalCountry } from "@/lib/postal-country";

export type ChatAttachment = {
  url: string;
  name: string;
  size: number;
  type: "image" | "file";
  mime: string;
};

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [rem, setRem] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const id = setInterval(() => setRem((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (rem <= 0) return <span className="text-[10px] text-danger">siliniyor…</span>;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-warning">
      <Clock className="h-2.5 w-2.5" />
      {m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`}
    </span>
  );
}

export type MessageReaction = { emoji: string; count: number };

export type MessageReplyTo = {
  id: string;
  body: string;
  deletedAt?: string | null;
  user?: { profile?: { displayName?: string | null } | null } | null;
};

type Props = {
  isMe: boolean;
  grouped: boolean;
  body?: string;
  attachments?: ChatAttachment[] | null;
  expiresAt?: string | null;
  createdAt: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: string;
  postalCountry?: PostalCountry | null;
  showReadReceipt?: boolean;
  reactions?: MessageReaction[];
  replyTo?: MessageReplyTo | null;
  onNameClick?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onQuoteClick?: (messageId: string) => void;
};

export function ChatMessageBubble({
  isMe,
  grouped,
  body,
  attachments,
  expiresAt,
  createdAt,
  displayName,
  avatarUrl,
  role,
  postalCountry,
  showReadReceipt,
  reactions = [],
  replyTo,
  onNameClick,
  onDelete,
  onReact,
  onReply,
  onQuoteClick,
}: Props) {
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [popEmoji, setPopEmoji] = useState(false);
  const popTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => { if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current); }, []);

  // WhatsApp'taki gibi bir mesaja çift tıklandığında hızlıca 👍 reaksiyonu eklenir.
  function handleDoubleClick() {
    if (!onReact) return;
    onReact("👍");
    setPopEmoji(true);
    if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current);
    popTimeoutRef.current = setTimeout(() => setPopEmoji(false), 700);
  }

  const time = new Date(createdAt).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`group flex w-full ${grouped ? "mt-0.5" : "mt-3"} ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      {!isMe && (
        <div className="mr-2 w-8 flex-shrink-0 self-end">
          {!grouped ? (
            <ChatAvatar name={displayName} url={avatarUrl} role={role} />
          ) : (
            <span className="block h-8 w-8" />
          )}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}>
        {!grouped && !isMe && (
          <div className="mb-1 flex items-center gap-1.5 px-1">
            {onNameClick ? (
              <button
                type="button"
                onClick={onNameClick}
                className="text-xs font-semibold text-text hover:underline"
              >
                {displayName}
              </button>
            ) : (
              <span className="text-xs font-semibold text-text">{displayName}</span>
            )}
            <CountryFlagBadge country={postalCountry ?? undefined} />
          </div>
        )}

        <div className={`flex items-end gap-1 ${isMe ? "flex-row" : "flex-row-reverse"}`}>
          {isMe && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mb-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted hover:bg-danger/10 hover:text-danger md:hidden md:group-hover:flex"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {onReact && (
            <button
              ref={reactionBtnRef}
              type="button"
              onClick={() => setShowReactionBar((v) => !v)}
              aria-label="Reaksiyon ekle"
              className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-background hover:text-primary group-hover:opacity-100 md:opacity-0"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
          )}

          {onReply && (
            <button
              type="button"
              onClick={onReply}
              aria-label="Yanıtla"
              title="Yanıtla"
              className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-background hover:text-primary group-hover:opacity-100 md:opacity-0"
            >
              <Reply className="h-4 w-4" />
            </button>
          )}

          <div
            onDoubleClick={handleDoubleClick}
            className={`relative select-none rounded-2xl px-3 py-2 ${onReact ? "cursor-pointer" : ""} ${
              isMe
                ? "rounded-br-md bg-primary text-white"
                : "rounded-bl-md border border-border bg-surface text-text"
            }`}
          >
            {popEmoji && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl animate-[ping_0.6s_ease-out]">
                👍
              </span>
            )}
            {replyTo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuoteClick?.(replyTo.id);
                }}
                className={`mb-1.5 block w-full rounded-lg border-l-2 px-2 py-1 text-left text-xs ${
                  isMe
                    ? "border-white/60 bg-white/10 text-white/90"
                    : "border-primary bg-primary/5 text-muted"
                }`}
              >
                <span className={`block truncate font-semibold ${isMe ? "text-white" : "text-primary"}`}>
                  {replyTo.user?.profile?.displayName ?? "Kullanıcı"}
                </span>
                <span className="line-clamp-2 break-words">
                  {replyTo.deletedAt ? "Silinen mesaj" : replyTo.body || "📎 Ek"}
                </span>
              </button>
            )}
            {body && (
              <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${isMe ? "text-white" : ""}`}>
                {body}
              </p>
            )}
            {(attachments ?? []).length > 0 && (
              <div className={`space-y-1.5 ${body ? "mt-1.5" : ""}`}>
                {(attachments as ChatAttachment[]).map((att, j) =>
                  att.type === "image" ? (
                    <a key={j} href={att.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.url}
                        alt={att.name}
                        className={`max-h-52 max-w-full rounded-lg object-cover ${
                          isMe ? "border border-white/20" : "border border-border"
                        }`}
                      />
                    </a>
                  ) : (
                    <a
                      key={j}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                        isMe
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "border border-border bg-background hover:border-primary"
                      }`}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0 opacity-70" />
                      <span className="max-w-[200px] truncate">{att.name}</span>
                      <span className="opacity-70">{(att.size / 1024).toFixed(0)} KB</span>
                    </a>
                  ),
                )}
              </div>
            )}
            <div
              className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                isMe ? "text-white/70" : "text-muted"
              }`}
            >
              <span>{time}</span>
              {expiresAt && <ExpiryCountdown expiresAt={expiresAt} />}
            </div>
          </div>

          {onReact && (
            <ChatReactionBar
              open={showReactionBar}
              anchorRef={reactionBtnRef}
              align={isMe ? "right" : "left"}
              onClose={() => setShowReactionBar(false)}
              onSelect={(emoji) => onReact(emoji)}
            />
          )}
        </div>

        {/* Reaksiyonlar */}
        {reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap items-center gap-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact?.(r.emoji)}
                className="flex items-center gap-0.5 rounded-full border border-border bg-surface px-1.5 py-0.5 text-xs hover:border-primary"
              >
                {r.emoji} <span className="text-muted">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {isMe && showReadReceipt && (
          <span className="mt-0.5 px-1 text-[10px] text-muted">Görüldü</span>
        )}
      </div>
    </div>
  );
}

export function getLastReadOwnMessageId(
  messages: { id: string; createdAt: string; user: { id: string } }[],
  myId: string | undefined,
  partnerLastReadAt: string | null | undefined,
) {
  if (!myId || !partnerLastReadAt) return null;
  const readAt = new Date(partnerLastReadAt).getTime();
  const ownRead = messages.filter(
    (m) => m.user.id === myId && new Date(m.createdAt).getTime() <= readAt,
  );
  return ownRead.length ? ownRead[ownRead.length - 1].id : null;
}
