import type { Metadata } from "next";
import { api } from "@/lib/api";
import EtkinlikDetailClient from "./EtkinlikDetailClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const event = await api.get<{
      title: string;
      description: string;
      city: { name: string };
      state: { name: string };
    }>(`/events/${id}`, null, 300);
    const description = `${event.city.name}, ${event.state.name} — ${event.description.slice(0, 130)}`;
    return {
      title: event.title,
      description,
      openGraph: {
        title: event.title,
        description,
        type: "article",
      },
    };
  } catch {
    return { title: "Etkinlik" };
  }
}

export default function EtkinlikDetailPage() {
  return <EtkinlikDetailClient />;
}
