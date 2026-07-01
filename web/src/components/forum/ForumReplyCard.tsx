"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CornerDownRight,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { ForumReply } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { extractFirstUrl, LinkPreview, renderForumBody } from "@/lib/forum-markdown";
import { ReportButton } from "@/components/ui/ReportDialog";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import { ForumAvatar } from "./ForumAvatar";
import type { PostalCountry } from "@/lib/postal-country";

type Props = {
  reply: ForumReply;
  isOwner: boolean;
  topicStatus: string;
  topicId: string;
  token?: string | null;
  nested?: boolean;
  onVote: (replyId: string) => void;
  onMarkSolved: (replyId: string) => void;
  onReplyTo: (replyId: string, displayName: string) => void;
};

export function ForumReplyCard({
  reply,
  isOwner,
  topicStatus,
  token,
  nested = false,
  onVote,
  onMarkSolved,
  onReplyTo,
}: Props) {
  const [voting, setVoting] = useState(false);
  const name = reply.user?.profile?.displayName ?? "Kullanıcı";
  const userId = reply.user?.id;
  const previewUrl = extractFirstUrl(reply.body);

  async function handleVote() {
    if (!token || voting) return;
    setVoting(true);
    try {
      onVote(reply.id);
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className={nested ? "ml-6 mt-3 border-l-2 border-border pl-4" : ""}>
      <div
        className={`rounded-xl border p-4 ${
          reply.isBest && !nested
            ? "border-success/40 bg-success/5"
            : "border-border bg-surface"
        }`}
      >
        {reply.isBest && !nested && (
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            En iyi cevap
          </div>
        )}

        <div className="flex gap-3">
          <ForumAvatar
            name={name}
            userId={userId}
            role={reply.user?.role}
            avatarUrl={reply.user?.profile?.avatarUrl}
            size={nested ? "sm" : "md"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <UserDisplayName
                name={name}
                userId={userId}
                postalCountry={reply.user?.profile?.postalCountry as PostalCountry | undefined}
                linkToProfile={!!userId}
              />
              <span className="text-muted">· {formatDate(reply.createdAt)}</span>
              {reply._optimistic && (
                <span className="text-xs text-muted italic">gönderiliyor…</span>
              )}
            </div>

            <div className="mt-2 text-sm text-text">{renderForumBody(reply.body)}</div>
            {previewUrl && <LinkPreview url={previewUrl} />}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={handleVote}
                disabled={!token || voting || reply._optimistic}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
                  reply.userVoted
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary hover:text-primary"
                } disabled:opacity-40`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Faydalı {reply.voteCount ? `(${reply.voteCount})` : ""}
              </button>

              {token && !nested && (
                <button
                  type="button"
                  onClick={() => onReplyTo(reply.id, name)}
                  className="inline-flex items-center gap-1 text-muted hover:text-primary"
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                  Yanıtla
                </button>
              )}

              {isOwner && topicStatus !== "SOLVED" && !reply._optimistic && (
                <button
                  type="button"
                  onClick={() => onMarkSolved(reply.id)}
                  className="inline-flex items-center gap-1 text-success hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  En iyi seç
                </button>
              )}

              {!reply._optimistic && (
                <ReportButton targetType="FORUM_REPLY" targetId={reply.id} />
              )}
            </div>
          </div>
        </div>
      </div>

      {(reply.children ?? []).map((child) => (
        <ForumReplyCard
          key={child.id}
          reply={child}
          isOwner={isOwner}
          topicStatus={topicStatus}
          topicId=""
          token={token}
          nested
          onVote={onVote}
          onMarkSolved={onMarkSolved}
          onReplyTo={onReplyTo}
        />
      ))}
    </div>
  );
}
