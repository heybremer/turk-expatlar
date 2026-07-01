"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { UserDisplayName } from "@/components/user/UserDisplayName";
import type { PostalCountry } from "@/lib/postal-country";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";

type PublicUser = {
  id: string;
  role?: string;
  createdAt: string;
  profile: {
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    occupation?: string | null;
    postalCountry?: PostalCountry | null;
    state?: { name: string } | null;
    city?: { name: string } | null;
  };
};

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
      <PageContainer className="py-12 text-center text-muted">Yükleniyor…</PageContainer>
    );
  }

  const p = user.profile;
  const location = [p.city?.name, p.state?.name].filter(Boolean).join(", ");

  return (
    <PageContainer>
      <Link href="/forum" className="text-sm text-muted hover:text-primary">
        ← Foruma dön
      </Link>

      <Card className="mt-6 text-center">
        <div className="flex justify-center">
          <ForumAvatar
            name={p.displayName}
            userId={user.id}
            role={user.role}
            avatarUrl={p.avatarUrl}
            size={user.role === "ADMIN" ? "lg" : "md"}
          />
        </div>
        <div className="mt-4 flex justify-center">
          <UserDisplayName
            name={p.displayName}
            userId={user.id}
            postalCountry={p.postalCountry}
            linkToProfile={false}
            nameClassName="text-xl font-bold"
          />
        </div>
        {p.occupation && <p className="mt-1 text-sm text-muted">{p.occupation}</p>}
        {location && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" />
            {location}
          </p>
        )}
        {p.bio && (
          <p className="mt-4 text-left text-sm text-text whitespace-pre-wrap">{p.bio}</p>
        )}
        <Link
          href={`/sohbet/dm/${user.id}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <MessageCircle className="h-4 w-4" />
          Özel mesaj gönder
        </Link>
      </Card>
    </PageContainer>
  );
}
