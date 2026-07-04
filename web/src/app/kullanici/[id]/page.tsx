"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Clock,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LevelCard } from "@/components/user/LevelCard";
import { StarRating } from "@/components/user/StarRating";
import { UserReviewsSection } from "@/components/user/UserReviewsSection";
import { FriendButton } from "@/components/user/FriendButton";
import { ReportButton } from "@/components/ui/ReportDialog";
import type { LevelProgress } from "@/lib/auth";

type PublicUser = {
  id: string;
  role?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  levelProgress?: LevelProgress;
  reviewStats?: { averageRating: number; reviewCount: number };
  profile: {
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    occupation?: string | null;
    languages?: string[];
    interests?: string[];
    userStatus?: string | null;
    postalCountry?: PostalCountry | null;
    state?: { name: string } | null;
    city?: { name: string } | null;
  };
};

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatLastSeen(iso?: string | null) {
  if (!iso) return "Bilinmiyor";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KullaniciProfilPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    api
      .get<PublicUser>(`/users/${params.id}/public`)
      .then(setUser)
      .catch(() => setError("Kullanıcı bulunamadı"));
  }, [params?.id]);

  if (error) {
    return (
      <PageContainer className="py-12 text-center text-muted">{error}</PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer className="py-16 text-center text-muted">Yükleniyor…</PageContainer>
    );
  }

  const p = user.profile;
  const location = [p.city?.name, p.state?.name].filter(Boolean).join(", ");

  return (
    <PageContainer>
      <Link href="/forum" className="text-sm text-muted hover:text-primary">
        ← Foruma dön
      </Link>

      {/* Kapak / kimlik kartı */}
      <Card className="mt-6 overflow-hidden !p-0">
        <div className="h-28 bg-gradient-to-r from-primary to-accent sm:h-32" />
        <div className="flex flex-col items-center px-5 pb-6 sm:px-6">
          <div className="-mt-14 rounded-full bg-surface p-1.5 sm:-mt-16">
            <ForumAvatar
              name={p.displayName}
              userId={user.id}
              role={user.role}
              avatarUrl={p.avatarUrl}
              size="2xl"
            />
          </div>

          <div className="mt-3 flex flex-col items-center text-center">
            <UserDisplayName
              name={p.displayName}
              userId={user.id}
              postalCountry={p.postalCountry}
              linkToProfile={false}
              nameClassName="text-xl font-bold"
            />
            {p.occupation && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
                <Briefcase className="h-3.5 w-3.5" />
                {p.occupation}
              </p>
            )}
          </div>

          {/* Hızlı bilgi rozetleri */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {user.levelProgress && <LevelCard levelProgress={user.levelProgress} compact />}
            {user.reviewStats && user.reviewStats.reviewCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                <StarRating value={user.reviewStats.averageRating} />
                {user.reviewStats.averageRating.toFixed(1)} ({user.reviewStats.reviewCount})
              </span>
            )}
            {user.role === "ADMIN" && (
              <Badge variant="accent">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Yönetici
              </Badge>
            )}
            {location && (
              <span className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-muted">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={`/sohbet/dm/${user.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" />
              Mesaj gönder
            </Link>
            <FriendButton targetUserId={user.id} />
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Hakkında */}
          <Card>
            <h2 className="font-semibold">Hakkında</h2>
            {p.bio ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{p.bio}</p>
            ) : (
              <p className="mt-2 text-sm text-muted">Kullanıcı henüz kendisi hakkında bilgi eklememiş.</p>
            )}

            {(p.interests?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Heart className="h-3.5 w-3.5" />
                  İlgi alanları
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.interests!.map((i) => (
                    <Badge key={i} variant="muted">
                      {i}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(p.languages?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Globe className="h-3.5 w-3.5" />
                  Konuştuğu diller
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.languages!.map((l) => (
                    <Badge key={l} variant="default">
                      {l.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Seviye detayı */}
          {user.levelProgress && (
            <Card>
              <h2 className="font-semibold">Seviye ve puan</h2>
              <div className="mt-3">
                <LevelCard levelProgress={user.levelProgress} />
              </div>
            </Card>
          )}

          {/* Yorumlar */}
          <UserReviewsSection targetUserId={user.id} />
        </div>

        <div className="space-y-6">
          {/* Üyelik bilgisi */}
          <Card>
            <h2 className="font-semibold">Üyelik bilgisi</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-muted">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  Üyelik tarihi
                  <br />
                  <span className="font-medium text-text">
                    {formatMemberSince(user.createdAt)}
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-muted">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Son giriş
                  <br />
                  <span className="font-medium text-text">
                    {formatLastSeen(user.lastLoginAt)}
                  </span>
                </span>
              </li>
              {p.userStatus && (
                <li className="flex items-center gap-2.5 text-muted">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    Durum
                    <br />
                    <span className="font-medium text-text">{p.userStatus}</span>
                  </span>
                </li>
              )}
            </ul>
          </Card>

          <div className="text-center">
            <ReportButton targetType="USER" targetId={user.id} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
