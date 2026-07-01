"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Hand, MapPin, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { api, ForumReply, ForumTopicDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { renderForumBody } from "@/lib/forum-markdown";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ReportButton } from "@/components/ui/ReportDialog";
import { SensitiveBanner } from "@/components/ui/SensitiveBanner";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { ForumPoll } from "@/components/forum/ForumPoll";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";
import { ForumReplyCard } from "@/components/forum/ForumReplyCard";
import { ForumReplyForm } from "@/components/forum/ForumReplyForm";

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "muted" }
> = {
  OPEN: { label: "Açık", variant: "default" },
  ANSWERED: { label: "Cevaplandı", variant: "warning" },
  SOLVED: { label: "Çözüldü", variant: "success" },
  LOCKED: { label: "Kilitli", variant: "muted" },
};

function draftKey(topicId: string) {
  return `forum-draft-${topicId}`;
}

export default function ForumDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const topicId = params?.id ?? "";

  const [topic, setTopic] = useState<ForumTopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [reply, setReply] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const draftLoaded = useRef(false);

  useEffect(() => {
    if (!topicId || draftLoaded.current) return;
    draftLoaded.current = true;
    const saved = localStorage.getItem(draftKey(topicId));
    if (saved) setReply(saved);
  }, [topicId]);

  useEffect(() => {
    if (!topicId || !draftLoaded.current) return;
    if (reply.trim()) {
      localStorage.setItem(draftKey(topicId), reply);
    } else {
      localStorage.removeItem(draftKey(topicId));
    }
  }, [reply, topicId]);

  const load = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    try {
      const data = await api.get<ForumTopicDetail>(`/forum/topics/${topicId}`, token);
      setTopic(data);
      setNotFound(false);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 404) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : "Konu yüklenemedi");
      }
    } finally {
      setLoading(false);
    }
  }, [topicId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const { bestReply, otherReplies } = useMemo(() => {
    if (!topic?.replies.length) return { bestReply: null, otherReplies: [] as ForumReply[] };
    const best = topic.replies.find((r) => r.isBest) ?? null;
    const others = topic.replies.filter((r) => !r.isBest);
    return { bestReply: best, otherReplies: others };
  }, [topic?.replies]);

  function patchReplyVotes(replyId: string, voted: boolean, count: number) {
    setTopic((prev) => {
      if (!prev) return prev;
      const patch = (r: ForumReply): ForumReply => {
        if (r.id === replyId) return { ...r, userVoted: voted, voteCount: count };
        return {
          ...r,
          children: r.children?.map((c) =>
            c.id === replyId ? { ...c, userVoted: voted, voteCount: count } : c,
          ),
        };
      };
      return { ...prev, replies: prev.replies.map(patch) };
    });
  }

  async function handleVote(replyId: string) {
    if (!token) { router.push("/giris"); return; }
    const find = (list: ForumReply[]) => {
      for (const r of list) {
        if (r.id === replyId) return r;
        const c = r.children?.find((x) => x.id === replyId);
        if (c) return c;
      }
      return null;
    };
    const current = topic ? find(topic.replies) : null;
    const wasVoted = current?.userVoted ?? false;
    const prevCount = current?.voteCount ?? 0;
    patchReplyVotes(replyId, !wasVoted, wasVoted ? prevCount - 1 : prevCount + 1);
    try {
      const res = await api.post<{ voted: boolean; count: number }>(
        `/forum/replies/${replyId}/vote`, {}, token,
      );
      patchReplyVotes(replyId, res.voted, res.count);
    } catch {
      patchReplyVotes(replyId, wasVoted, prevCount);
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { router.push("/giris"); return; }
    if (reply.trim().length < 5) { setError("Cevap en az 5 karakter olmalı"); return; }

    const tempId = `temp-${Date.now()}`;
    const optimistic: ForumReply = {
      id: tempId, body: reply.trim(), isBest: false,
      createdAt: new Date().toISOString(), parentId, voteCount: 0, userVoted: false,
      _optimistic: true, children: [],
      user: {
        id: user?.id ?? "",
        profile: { displayName: user?.profile?.displayName ?? "Ben", avatarUrl: user?.profile?.avatarUrl },
      },
    };

    const bodyToSend = reply.trim();
    const parentToSend = parentId;
    setReply(""); setParentId(null); setReplyToName(null);
    localStorage.removeItem(draftKey(topicId));
    setError(""); setSubmitting(true);

    setTopic((prev) => {
      if (!prev) return prev;
      if (parentToSend) {
        return { ...prev, replies: prev.replies.map((r) => r.id === parentToSend ? { ...r, children: [...(r.children ?? []), optimistic] } : r), _count: { ...prev._count, replies: (prev._count?.replies ?? prev.replies.length) + 1 } };
      }
      return { ...prev, replies: [...prev.replies, optimistic], status: prev.status === "OPEN" ? "ANSWERED" : prev.status, _count: { ...prev._count, replies: (prev._count?.replies ?? prev.replies.length) + 1 } };
    });

    try {
      const created = await api.post<ForumReply>(
        `/forum/topics/${topicId}/replies`,
        { body: bodyToSend, parentId: parentToSend ?? undefined }, token,
      );
      setTopic((prev) => {
        if (!prev) return prev;
        const replaceTemp = (list: ForumReply[]): ForumReply[] =>
          list.map((r) => { if (r.id === tempId) return created; return { ...r, children: r.children ? replaceTemp(r.children) : [] }; });
        return { ...prev, replies: replaceTemp(prev.replies) };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cevap gönderilemedi");
      setReply(bodyToSend);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleMeToo() {
    if (!token) { router.push("/giris"); return; }
    try {
      await api.post(`/forum/topics/${topicId}/me-too`, {}, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    }
  }

  async function markSolved(replyId: string) {
    if (!token) return;
    try {
      await api.post(`/forum/topics/${topicId}/solve/${replyId}`, {}, token);
      setTopic((prev) => {
        if (!prev) return prev;
        return { ...prev, status: "SOLVED", solvedReplyId: replyId, replies: prev.replies.map((r) => ({ ...r, isBest: r.id === replyId })) };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşaretlenemedi");
    }
  }

  async function saveTopicEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !topic) return;
    setEditSubmitting(true);
    try {
      const updated = await api.patch<ForumTopicDetail>(`/forum/topics/${topicId}`, { title: editTitle, body: editBody }, token);
      setTopic((prev) => prev ? { ...prev, title: updated.title, body: updated.body } : prev);
      setEditMode(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Güncellenemedi"); }
    finally { setEditSubmitting(false); }
  }

  async function handleDeleteTopic() {
    if (!token || !topic) return;
    if (!confirm("Konuyu silmek istediğinizden emin misiniz?")) return;
    try {
      await api.delete(`/forum/topics/${topicId}`, token);
      router.push("/forum");
    } catch (e) { setError(e instanceof Error ? e.message : "Silinemedi"); }
  }

  function startReplyTo(id: string, name: string) {
    setParentId(id); setReplyToName(name);
    setReply((prev) => (prev.startsWith("@") ? prev : `@${name} `));
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-full min-w-0">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-surface" />
          <div className="h-8 w-3/4 rounded bg-surface" />
          <div className="h-48 rounded bg-surface" />
        </div>
      </div>
    );
  }

  // 404 state
  if (notFound) {
    return (
      <div className="w-full min-w-0 py-4 text-center">
        <p className="text-xl font-semibold">Konu bulunamadı</p>
        <p className="mt-2 text-muted">Bu konu silinmiş veya hiç oluşturulmamış olabilir.</p>
        <Link href="/forum" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Foruma dön
        </Link>
      </div>
    );
  }

  // Generic error
  if (error && !topic) {
    return (
      <div className="w-full min-w-0 py-4 text-center">
        <p className="text-muted">{error}</p>
        <button onClick={() => void load()} className="mt-3 text-sm text-primary hover:underline">
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!topic) return null;

  const status = statusLabels[topic.status] ?? statusLabels.OPEN;
  const isOwner = user?.id === topic.user?.id;
  const interestCount = topic._count?.interests ?? 0;
  const topicAuthor = topic.user?.profile?.displayName ?? "Kullanıcı";

  return (
    <div className="w-full min-w-0 pb-32">
      <Link href="/forum" className="text-sm text-muted hover:text-primary">← Foruma dön</Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="muted">{topic.category.name}</Badge>
        <Badge variant={status.variant}>{status.label}</Badge>
        {topic.city && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3 w-3" />{topic.city.name}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{topic.title}</h1>
        {isOwner && !editMode && (
          <div className="flex shrink-0 gap-2">
            <button onClick={() => { setEditTitle(topic.title); setEditBody(topic.body); setEditMode(true); }} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted hover:text-text">
              <Pencil className="h-3 w-3" />Düzenle
            </button>
            <button onClick={handleDeleteTopic} className="inline-flex items-center gap-1 rounded border border-danger/30 px-2 py-1 text-xs text-danger hover:bg-danger/10">
              <Trash2 className="h-3 w-3" />Sil
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ForumAvatar name={topicAuthor} userId={topic.user?.id} role={topic.user?.role} avatarUrl={topic.user?.profile?.avatarUrl} size={topic.user?.role === "ADMIN" ? "lg" : "md"} />
        <div className="text-sm text-muted">
          <UserDisplayName name={topicAuthor} userId={topic.user?.id} postalCountry={topic.user?.profile?.postalCountry as PostalCountry | undefined} />
          <span> · {formatDate(topic.createdAt)}</span>
          <span className="ml-2"><ReportButton targetType="FORUM_TOPIC" targetId={topic.id} /></span>
        </div>
      </div>

      <div className="mt-4"><SensitiveBanner categorySlug={topic.category.slug} /></div>

      {editMode ? (
        <Card className="mt-6">
          <form onSubmit={saveTopicEdit} className="space-y-3">
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} minLength={5} required />
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={8} value={editBody} onChange={(e) => setEditBody(e.target.value)} minLength={20} required />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={editSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{editSubmitting ? "Kaydediliyor…" : "Kaydet"}</button>
              <button type="button" onClick={() => setEditMode(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text">İptal</button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="mt-6">
          <div className="text-text">{renderForumBody(topic.body)}</div>
          {topic.poll && (
            <ForumPoll topicId={topic.id} initialPoll={topic.poll ?? null} />
          )}
        </Card>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={toggleMeToo} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${topic.userInterested ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary hover:text-primary"}`}>
          <Hand className="h-4 w-4" />Ben de yaşıyorum ({interestCount})
        </button>
        <span className="flex items-center gap-1 text-sm text-muted">
          <MessageSquare className="h-4 w-4" />{topic._count?.replies ?? topic.replies.length} cevap
        </span>
        <ShareButtons
          title={topic.title}
          text={`Türk Expatlar Forum: ${topic.title}`}
          className="ml-auto"
        />
      </div>

      {bestReply && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-success">
            <CheckCircle2 className="h-5 w-5" />En iyi cevap
          </h2>
          <ForumReplyCard reply={bestReply} isOwner={isOwner} topicStatus={topic.status} topicId={topicId} token={token} onVote={handleVote} onMarkSolved={markSolved} onReplyTo={startReplyTo} />
        </section>
      )}

      <h2 className="mt-10 text-lg font-semibold">
        {bestReply ? "Diğer cevaplar" : "Cevaplar"}
        {otherReplies.length > 0 && <span className="ml-2 text-sm font-normal text-muted">({otherReplies.length})</span>}
      </h2>

      <div className="mt-4 space-y-4">
        {topic.replies.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted">Henüz cevap yok. İlk cevabı sen yaz.</p>
        ) : otherReplies.length === 0 && bestReply ? (
          <p className="text-sm text-muted">Başka cevap yok.</p>
        ) : (
          otherReplies.map((r) => (
            <ForumReplyCard key={r.id} reply={r} isOwner={isOwner} topicStatus={topic.status} topicId={topicId} token={token} onVote={handleVote} onMarkSolved={markSolved} onReplyTo={startReplyTo} />
          ))
        )}
      </div>

      <div ref={formRef}>
        <Card className="mt-8">
          <h3 className="font-semibold">Cevap yaz</h3>
          <div className="mt-4">
            <ForumReplyForm topicId={topicId} token={token} value={reply} onChange={setReply} parentId={parentId} replyToName={replyToName} onClearParent={() => { setParentId(null); setReplyToName(null); }} onSubmit={submitReply} submitting={submitting} error={error} />
          </div>
        </Card>
      </div>
    </div>
  );
}
