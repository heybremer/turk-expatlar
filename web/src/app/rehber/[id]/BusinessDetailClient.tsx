"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, Globe, MapPin, MessageCircle, Pencil, Phone, Star } from "lucide-react";
import { api, Business, BusinessReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MapView } from "@/components/ui/MapView";
import { ReportButton } from "@/components/ui/ReportDialog";

function StarRow({ rating, onChange, readonly = false, size = "sm" }: { rating: number; onChange?: (n: number) => void; readonly?: boolean; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-6 w-6" : "h-3.5 w-3.5";
  return (
    <span className="flex items-center gap-0.5 text-warning">
      {[1, 2, 3, 4, 5].map((n) =>
        readonly ? (
          n <= rating ? <Star key={n} className={`${cls} fill-warning text-warning`} /> : null
        ) : (
          <button key={n} type="button" onClick={() => onChange?.(n)} className="text-warning">
            <Star className={`${cls} ${n <= rating ? "fill-warning" : "fill-transparent"}`} />
          </button>
        ),
      )}
    </span>
  );
}

export default function BusinessDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myReview, setMyReview] = useState<BusinessReview | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");

  const loadMyReview = useCallback(async () => {
    if (!token || !params?.id) { setMyReview(null); return; }
    try {
      const data = await api.get<BusinessReview | null>(`/businesses/${params.id}/reviews/me`, token);
      setMyReview(data);
    } catch { setMyReview(null); }
  }, [token, params?.id]);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const data = await api.get<Business>(`/businesses/${params.id}`);
      setBiz(data);
      setNotFound(false);
      await loadMyReview();
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 404) setNotFound(true);
      else setError(e instanceof Error ? e.message : "İşletme yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [params?.id, loadMyReview]);

  useEffect(() => { void load(); }, [load]);

  const pendingReview = myReview?.status === "PENDING" ? myReview : null;
  const canWriteReview = token && !myReview;
  const canEditReview = pendingReview && (pendingReview.editCount ?? 0) < 1;

  function startEdit() {
    if (!pendingReview) return;
    setEditRating(pendingReview.rating); setEditComment(pendingReview.comment ?? "");
    setEditing(true); setError("");
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { router.push("/giris"); return; }
    if (comment.length > 0 && comment.length < 10) { setError("Yorum en az 10 karakter olmalı"); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const created = await api.post<BusinessReview>(`/businesses/${params.id}/reviews`, { rating, comment: comment || undefined }, token);
      setComment(""); setRating(5); setMyReview(created);
      setSuccess("Yorumunuz iletildi. Admin onayından sonra yayınlanacaktır.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Yorum eklenemedi"); }
    finally { setSubmitting(false); }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !pendingReview) return;
    if (editComment.length > 0 && editComment.length < 10) { setError("Yorum en az 10 karakter olmalı"); return; }
    setSubmitting(true); setError("");
    try {
      const updated = await api.patch<BusinessReview>(`/businesses/${params.id}/reviews/me`, { rating: editRating, comment: editComment || undefined }, token);
      setMyReview(updated); setEditing(false);
      setSuccess("Yorumunuz güncellendi. Admin onayından sonra yayınlanacaktır.");
    } catch (e) { setError(e instanceof Error ? e.message : "Güncellenemedi"); }
    finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-surface" />
        <div className="h-8 w-1/2 rounded bg-surface" />
        <div className="h-40 rounded bg-surface" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full min-w-0 py-4 text-center">
        <p className="text-xl font-semibold">İşletme bulunamadı</p>
        <p className="mt-2 text-muted">Bu işletme silinmiş veya hiç kaydedilmemiş olabilir.</p>
        <Link href="/rehber" className="mt-4 inline-block text-sm text-primary hover:underline">← Rehbere dön</Link>
      </div>
    );
  }

  if (error && !biz) {
    return (
      <div className="w-full min-w-0 py-4 text-center">
        <p className="text-muted">{error}</p>
        <button onClick={() => void load()} className="mt-3 text-sm text-primary hover:underline">Tekrar dene</button>
      </div>
    );
  }

  if (!biz) return null;

  const publicReviews = biz.reviews ?? [];

  return (
    <div className="w-full min-w-0">
      <Link href="/rehber" className="text-sm text-muted hover:text-primary">← Rehbere dön</Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="muted">{biz.category.name}</Badge>
        {biz.speaksTurkish && <Badge variant="default">Türkçe konuşuluyor</Badge>}
        {biz.isVerified && (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Doğrulanmış işletme
          </Badge>
        )}
        {!biz.isVerified && biz.verificationStatus === "PENDING_REVIEW" && (
          <Badge variant="muted" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Doğrulama bekleniyor
          </Badge>
        )}
      </div>

      <h1 className="mt-3 text-2xl font-bold">{biz.name}</h1>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 font-medium text-warning">
          <Star className="h-4 w-4 fill-warning text-warning" />{biz.averageRating.toFixed(1)}
        </span>
        <span className="text-muted">{biz.reviewCount} yorum</span>
        <span className="ml-auto"><ReportButton targetType="BUSINESS" targetId={biz.id} /></span>
      </div>

      <Card className="mt-6">
        <p className="whitespace-pre-wrap text-text">{biz.description}</p>
        <div className="mt-4 grid gap-2 text-sm text-muted">
          {biz.address && (
            <>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />{biz.address}
              </p>
              {biz.latitude && biz.longitude ? (
                <MapView
                  markers={[{ lat: biz.latitude, lng: biz.longitude, title: biz.name, subtitle: biz.address ?? undefined, color: "accent" }]}
                  zoom={15}
                  height="200px"
                  className="mt-2"
                />
              ) : (
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent((biz.address ?? biz.name) + ', ' + biz.city.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Haritada aç →
                </a>
              )}
            </>
          )}
          {biz.phone && <a href={`tel:${biz.phone}`} className="flex items-center gap-2 text-primary"><Phone className="h-4 w-4" />{biz.phone}</a>}
          {biz.whatsapp && <a href={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-success"><MessageCircle className="h-4 w-4" />WhatsApp ile yaz</a>}
          {biz.website && <a href={biz.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary"><Globe className="h-4 w-4" />{biz.website}</a>}
        </div>
      </Card>

      <h2 className="mt-10 text-lg font-semibold">Yorumlar</h2>
      {success && <p className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{success}</p>}

      <div className="mt-4 space-y-3">
        {pendingReview && !editing && (
          <Card className="border-dashed border-warning/40 bg-muted/30 opacity-70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StarRow rating={pendingReview.rating} readonly />
                  <span className="text-sm font-medium text-muted">Senin yorumun</span>
                  <Badge variant="muted" className="gap-1"><Clock className="h-3 w-3" />Onay bekliyor</Badge>
                </div>
                {pendingReview.comment && <p className="mt-2 text-sm text-muted">{pendingReview.comment}</p>}
                <p className="mt-1 text-xs text-muted">{formatDate(pendingReview.createdAt)}</p>
              </div>
              {canEditReview && <Button size="sm" variant="ghost" onClick={startEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" />Düzelt</Button>}
            </div>
          </Card>
        )}
        {pendingReview && editing && (
          <Card className="border-warning/40 bg-muted/20">
            <h3 className="font-medium">Yorumunu düzelt</h3>
            <p className="mt-1 text-xs text-muted">Yalnızca bir kez düzenleyebilirsin.</p>
            <form onSubmit={saveEdit} className="mt-4 space-y-3">
              <div><label className="block text-sm font-medium">Puan</label><div className="mt-2"><StarRow rating={editRating} onChange={setEditRating} size="lg" /></div></div>
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} value={editComment} onChange={(e) => setEditComment(e.target.value)} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Kaydediliyor…" : "Kaydet"}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>İptal</Button>
              </div>
            </form>
          </Card>
        )}
        {publicReviews.length === 0 && !pendingReview ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted">Henüz yorum yok. İlk yorumu sen yaz.</p>
        ) : (
          publicReviews.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-2">
                <StarRow rating={r.rating} readonly />
                <span className="text-sm font-medium">{r.user?.profile?.displayName ?? "Kullanıcı"}</span>
                <span className="text-xs text-muted">· {formatDate(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-text">{r.comment}</p>}
            </Card>
          ))
        )}
      </div>

      {canWriteReview && (
        <Card className="mt-8">
          <h3 className="font-semibold">Yorum yaz</h3>
          <p className="mt-1 text-sm text-muted">Yorumun yalnızca gerçek deneyimine dayanmalı.</p>
          <form onSubmit={submitReview} className="mt-4 space-y-3">
            <div><label className="block text-sm font-medium">Puan</label><div className="mt-2"><StarRow rating={rating} onChange={setRating} size="lg" /></div></div>
            <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder="Deneyimini paylaş (opsiyonel, min 10 karakter)" value={comment} onChange={(e) => { setComment(e.target.value); if (success) setSuccess(""); }} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Yorumu gönder"}</Button>
          </form>
        </Card>
      )}
      {!token && (
        <Card className="mt-8">
          <p className="text-sm text-muted">Yorum yazmak için giriş yapmalısın.</p>
          <Link href="/giris" className="mt-3 inline-block"><Button>Giriş yap</Button></Link>
        </Card>
      )}
    </div>
  );
}
