"use client";

import { Building2 } from "lucide-react";
import { NewsFeedPage } from "@/components/uygulamalar/NewsFeedPage";

export default function SehirHaberleriPage() {
  return (
    <NewsFeedPage
      feature="appCityNewsEnabled"
      title="Şehir Haberleri"
      icon={<Building2 className="h-5 w-5 text-primary" />}
      noProfileTitle="Şehir bilgisi bulunamadı"
      noProfileDescAuth="Şehir haberlerini görmek için profilinize şehir bilgisi ekleyin."
      noProfileDescGuest="Şehir haberlerini görmek için giriş yapın ve profilinizde şehir bilgisi ekleyin."
      buildFetchUrl={(loc) => {
        const params = new URLSearchParams({ cityName: loc.name });
        if (loc.stateName) params.set("stateName", loc.stateName);
        return `/news/city?${params.toString()}`;
      }}
      resolveLocation={(profile) => {
        const cityName = profile?.city?.name;
        const stateName = profile?.state?.name;
        return cityName ? { name: cityName, stateName } : null;
      }}
    />
  );
}
