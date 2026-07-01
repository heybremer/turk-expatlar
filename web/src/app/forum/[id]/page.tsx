import type { Metadata } from "next";
import { api } from "@/lib/api";
import ForumDetailClient from "./ForumDetailClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const topic = await api.get<{ title: string; body: string; category: { name: string } }>(
      `/forum/topics/${id}`,
      null,
      300, // 5 dakika ISR
    );
    const description = topic.body.replace(/[#*`_[\]()]/g, "").slice(0, 160);
    return {
      title: topic.title,
      description,
      openGraph: {
        title: topic.title,
        description,
        type: "article",
      },
    };
  } catch {
    return { title: "Forum Konusu" };
  }
}

export default function ForumDetailPage() {
  return <ForumDetailClient />;
}
