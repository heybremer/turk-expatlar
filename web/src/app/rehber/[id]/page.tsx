import type { Metadata } from "next";
import { api } from "@/lib/api";
import BusinessDetailClient from "./BusinessDetailClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const biz = await api.get<{
      name: string;
      description: string;
      category: { name: string };
    }>(`/businesses/${id}`, null, 300);
    const description = `${biz.category.name} — ${biz.description.slice(0, 140)}`;
    return {
      title: biz.name,
      description,
      openGraph: { title: biz.name, description },
    };
  } catch {
    return { title: "İşletme Rehberi" };
  }
}

export default function IsletmeDetailPage() {
  return <BusinessDetailClient />;
}
