"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import { StarRating, StarRatingInput } from "@/components/user/StarRating";

type ReviewAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  editCount: number;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthor;
};

type ReviewsResponse = {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function UserReviewsSection({ targetUserId }: { targetUserId: string }) {
  const { user, token } = useAuth();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isOwnProfile = user?.id === targetUserId;
  const myReview = data?.reviews.find((r) => r.author.id === user?.id);

  function load() {
    api
      .get<ReviewsResponse>(`/users/${targetUserId}/reviews`)
      .then(setData)
      .catch(() => setError("Yorumlar yüklenemedi"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  function startEditing(review: Review) {
    setRating(review.rating);
    setComment(review.comment);
    setFormError("");
    setEditingId(review.id);
  }

  async function submit() {
    if (!token) {
      setFormError("Yorum yapmak için giriş yapmalısınız.");
      return;
    }
    if (comment.trim().length < 10) {
      setFormError("Yorum en az 10 karakter olmalı.");
      return;
    }
    setSending(true);
    setFormError("");
    try {
      if (editingId) {
        await api.patch(`/users/reviews/${editingId}`, { rating, comment }, token);
      } else {
        await api.post(`/users/${targetUserId}/reviews`, { rating, comment }, token);
      }
      setEditingId(null);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Yorum gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  async function remove(reviewId: string) {
    if (!token) return;
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/users/reviews/${reviewId}`, token);
      load();
    } catch {
      alert("Yorum silinemedi");
    }
  }

  if (error) {
    return <Card className="mt-6 text-center text-sm text-muted">{error}</Card>;
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MessageSquareText className="h-4.5 w-4.5 text-primary" />
          Değerlendirmeler
        </h2>
        {data && data.reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={data.averageRating} />
            <span className="text-sm font-medium text-text">
              {data.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-muted">({data.reviewCount})</span>
          </div>
        )}
      </div>

      {!isOwnProfile && !myReview && (
        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-medium">Bu kullanıcı hakkında yorum yap</p>
          <div className="mt-2">
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <textarea
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            placeholder="Deneyiminizi paylaşın (en az 10 karakter)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {formError && <p className="mt-1 text-xs text-danger">{formError}</p>}
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submit} disabled={sending}>
              {sending ? "Gönderiliyor…" : "Yorumu gönder"}
            </Button>
          </div>
        </div>
      )}

      {myReview && editingId === myReview.id && (
        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-medium">Yorumunu düzenle</p>
          <div className="mt-2">
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <textarea
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {formError && <p className="mt-1 text-xs text-danger">{formError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Vazgeç
            </Button>
            <Button size="sm" onClick={submit} disabled={sending}>
              {sending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 divide-y divide-border">
        {data?.reviews.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            Henüz yorum yapılmamış. İlk yorumu sen yaz!
          </p>
        )}
        {data?.reviews.map((r) => (
          <div key={r.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <ForumAvatar
              name={r.author.displayName}
              userId={r.author.id}
              avatarUrl={r.author.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <UserDisplayName
                  name={r.author.displayName}
                  userId={r.author.id}
                  nameClassName="text-sm font-semibold"
                />
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} />
                  <span className="text-[11px] text-muted">{formatDate(r.createdAt)}</span>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">{r.comment}</p>
              {r.author.id === user?.id && (
                <div className="mt-1.5 flex gap-3">
                  {editingId !== r.id && (
                    <button
                      onClick={() => startEditing(r)}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                      Düzenle
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                    Sil
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
