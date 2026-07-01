"use client";

import { Newspaper } from "lucide-react";
import { NewsFeedPage } from "@/components/uygulamalar/NewsFeedPage";

export default function EyaletHaberleriPage() {
  return (
    <NewsFeedPage
      feature="appStateNewsEnabled"
      title="Eyalet Haberleri"
      icon={<Newspaper className="h-5 w-5 text-primary" />}
      noProfileTitle="Eyalet bilgisi bulunamadı"
      noProfileDescAuth="Eyalet haberlerini görmek için profilinize eyalet bilgisi ekleyin."
      noProfileDescGuest="Eyalet haberlerini görmek için giriş yapın ve profilinizde eyalet bilgisi ekleyin."
      buildFetchUrl={(loc) =>
        `/news/state?stateName=${encodeURIComponent(loc.name)}`
      }
      resolveLocation={(profile) => {
        const name = profile?.state?.name;
        return name ? { name } : null;
      }}
    />
  );
}
