import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ForumRulesContent } from "@/components/forum/forum-rules-content";

export default function ForumKurallariPage() {
  return (
    <PageContainer>
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" />
        Forum
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Forum Kuralları</h1>
          <p className="text-sm text-muted">Topluluk standartları ve moderasyon</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <ForumRulesContent />
      </div>

      <p className="mt-6 text-sm text-muted">
        Genel site kullanım şartları için{" "}
        <Link href="/kullanim" className="text-primary hover:underline">
          Kullanım Şartları
        </Link>{" "}
        sayfasına bakın. Sohbet kanalları için{" "}
        <Link href="/sohbet/kurallar" className="text-primary hover:underline">
          Sohbet Kuralları
        </Link>
        .
      </p>
    </PageContainer>
  );
}
