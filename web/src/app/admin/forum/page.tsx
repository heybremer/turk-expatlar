"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, ExternalLink, Loader2, MessageSquare, Pencil, Search, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AdminModal, AdminPagination } from "@/components/admin/AdminUi";

type ForumTopic = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  viewCount: number;
  user?: { email: string; profile?: { displayName: string } | null };
  category?: { name: string };
  _count?: { replies: number };
};

type ForumReply = {
  id: string;
  body: string;
  createdAt: string;
  user?: { email: string; profile?: { displayName: string } | null };
};

type TopicsResponse = {
  items: ForumTopic[];
  total: number;
  page: number;
  totalPages: number;
};

export default function AdminForumPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TopicsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [editTopic, setEditTopic] = useState<ForumTopic | null>(null);
  const [editReply, setEditReply] = useState<ForumReply | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      setData(await api.get<TopicsResponse>(`/admin/forum/topics?${params}`, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { void load(); }, [load]);

  async function toggleExpand(topicId: string) {
    if (expanded === topicId) {
      setExpanded(null);
      setReplies([]);
      return;
    }
    setExpanded(topicId);
    setRepliesLoading(true);
    try {
      const topic = await api.get<{ replies: ForumReply[] }>(`/admin/forum/topics/${topicId}`, token!);
      setReplies(topic.replies ?? []);
    } catch {
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  }

  async function deleteTopic(id: string) {
    if (!confirm("Bu forum konusu silinsin mi?")) return;
    await api.delete(`/admin/forum/topics/${id}`, token!);
    void load();
  }

  async function deleteReply(id: string) {
    if (!confirm("Bu yorum silinsin mi?")) return;
    await api.delete(`/admin/forum/replies/${id}`, token!);
    if (expanded) {
      const topic = await api.get<{ replies: ForumReply[] }>(`/admin/forum/topics/${expanded}`, token!);
      setReplies(topic.replies ?? []);
    }
    void load();
  }

  async function saveTopicEdit() {
    if (!editTopic) return;
    await api.patch(`/admin/forum/topics/${editTopic.id}`, { title: editTitle, body: editBody }, token!);
    setEditTopic(null);
    void load();
    if (expanded === editTopic.id) void toggleExpand(editTopic.id);
  }

  async function saveReplyEdit() {
    if (!editReply) return;
    await api.patch(`/admin/forum/replies/${editReply.id}`, { body: editBody }, token!);
    setEditReply(null);
    if (expanded) {
      const topic = await api.get<{ replies: ForumReply[] }>(`/admin/forum/topics/${expanded}`, token!);
      setReplies(topic.replies ?? []);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Forum Konuları</h1>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Konu ara…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />
        ) : data?.items.length === 0 ? (
          <p className="text-center text-muted py-8">Konu bulunamadı</p>
        ) : (
          data?.items.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{t.title}</p>
                    <Link href={`/forum/${t.id}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted hover:text-primary" />
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{t.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {t.user?.profile?.displayName ?? t.user?.email} · {t.category?.name} ·{" "}
                    {t._count?.replies ?? 0} cevap · {formatDate(t.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(t.id)}>
                    {expanded === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Yorumlar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditTopic(t);
                    setEditTitle(t.title);
                    setEditBody(t.body);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTopic(t.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>

              {expanded === t.id && (
                <div className="border-t border-border bg-background/50 px-4 py-3">
                  {repliesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  ) : replies.length === 0 ? (
                    <p className="text-xs text-muted">Yorum yok</p>
                  ) : (
                    <div className="space-y-2">
                      {replies.map((r) => (
                        <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium">
                              {r.user?.profile?.displayName ?? r.user?.email}
                            </p>
                            <p className="mt-1 text-sm">{r.body}</p>
                            <p className="mt-1 text-xs text-muted">{formatDate(r.createdAt)}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditReply(r);
                              setEditBody(r.body);
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteReply(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-danger" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {data && (
        <AdminPagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      )}

      {editTopic && (
        <AdminModal title="Konuyu Düzenle">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditTopic(null)}>İptal</Button>
            <Button onClick={() => void saveTopicEdit()}>Kaydet</Button>
          </div>
        </AdminModal>
      )}

      {editReply && (
        <AdminModal title="Yorumu Düzenle">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditReply(null)}>İptal</Button>
            <Button onClick={() => void saveReplyEdit()}>Kaydet</Button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
