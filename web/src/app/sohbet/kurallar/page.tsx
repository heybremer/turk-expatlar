import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChatRulesContent } from "@/components/sohbet/chat-rules-content";

export default function SohbetKurallariPage() {
  return (
    <PageContainer>
      <Link href="/sohbet" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" />
        Sohbet
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sohbet Kuralları</h1>
          <p className="text-sm text-muted">Topluluk standartları ve moderasyon</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <ChatRulesContent />
      </div>
    </PageContainer>
  );
}
