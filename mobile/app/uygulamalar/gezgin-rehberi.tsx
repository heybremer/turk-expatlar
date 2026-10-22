import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Compass, Lightbulb, MapPin, Navigation } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { SearchBar } from "@/components/ui/SearchBar";
import { ChipRow, Pill, SectionLabel, ToolHero } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";
import {
  getTravelGuideBySlug,
  PLACE_CATEGORY_LABELS,
  placeMapsQuery,
  TRAVEL_GUIDE_BY_STATE,
  type PlaceCategory,
  type TravelPlace,
} from "@/lib/data/travel-guide";

const DEFAULT_STATE = "nordrhein-westfalen";

function PlaceCard({ place, stateName }: { place: TravelPlace; stateName: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${placeMapsQuery(place, stateName)}`;
  return (
    <View className="mb-3 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <Pill label={PLACE_CATEGORY_LABELS[place.category]} tone="muted" />
          <Text className="mt-2 text-base font-bold text-text">{place.name}</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <MapPin size={13} color={colors.muted} />
            <Text className="text-sm text-muted">{place.city}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => void Linking.openURL(mapsUrl)}
          accessibilityRole="link"
          accessibilityLabel={`${place.name} haritada aç`}
          className="h-11 flex-row items-center gap-1.5 rounded-xl bg-primary/10 px-3 active:opacity-70"
        >
          <Navigation size={15} color={colors.primary} />
          <Text className="text-xs font-bold text-primary">Harita</Text>
        </Pressable>
      </View>
      <Text className="mt-3 text-sm leading-5 text-text">{place.description}</Text>
      {place.tip ? (
        <View className="mt-3 flex-row gap-2 rounded-xl bg-primary/5 p-3">
          <Lightbulb size={15} color={colors.primary} />
          <Text className="flex-1 text-xs leading-5 text-muted">{place.tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TravelGuideScreen() {
  const profileStateSlug = useAuth((state) => state.user?.profile?.state?.slug);
  const [stateSlug, setStateSlug] = useState(
    profileStateSlug && getTravelGuideBySlug(profileStateSlug) ? profileStateSlug : DEFAULT_STATE,
  );
  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [query, setQuery] = useState("");
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!touchedRef.current && profileStateSlug && getTravelGuideBySlug(profileStateSlug)) {
      setStateSlug(profileStateSlug);
    }
  }, [profileStateSlug]);

  const guide = useMemo(() => getTravelGuideBySlug(stateSlug), [stateSlug]);

  const categoryOptions = useMemo(() => {
    const present = new Set(guide?.places.map((p) => p.category));
    return [
      { value: "all" as const, label: "Tümü" },
      ...(Object.keys(PLACE_CATEGORY_LABELS) as PlaceCategory[])
        .filter((c) => present.has(c))
        .map((value) => ({ value, label: PLACE_CATEGORY_LABELS[value] })),
    ];
  }, [guide]);

  const places = useMemo(() => {
    if (!guide) return [];
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return guide.places.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return [p.name, p.city, p.description].some((f) => f.toLocaleLowerCase("tr-TR").includes(q));
    });
  }, [guide, category, query]);

  const changeState = (slug: string) => {
    touchedRef.current = true;
    setStateSlug(slug);
    setCategory("all");
    setQuery("");
  };

  return (
    <Screen title="Gezgin Rehberi" subtitle="Eyaletlere göre gezilecek yerler">
      <ToolHero
        icon={Compass}
        tint={colors.accent}
        title="Gezgin Rehberi"
        subtitle="Eyaletine göre gezilecek yerler, kısa bilgiler ve pratik ipuçları."
      />

      <Text className="mb-2 text-sm font-bold text-text">Eyalet</Text>
      <ChipRow
        options={TRAVEL_GUIDE_BY_STATE.map((s) => ({ value: s.slug, label: s.name }))}
        value={stateSlug}
        onChange={changeState}
      />

      {guide ? (
        <>
          <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-base font-extrabold text-text">{guide.name}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">{guide.intro}</Text>
          </View>

          <SearchBar className="mt-4" value={query} onChangeText={setQuery} placeholder="Yer veya şehir ara…" />
          <ChipRow className="mt-3" options={categoryOptions} value={category} onChange={setCategory} />

          <SectionLabel count={places.length}>Gezilecek yerler</SectionLabel>
          {places.length === 0 ? (
            <EmptyState icon={Compass} title="Bu filtreye uygun yer yok" />
          ) : (
            places.map((place) => (
              <PlaceCard key={`${place.name}-${place.city}`} place={place} stateName={guide.name} />
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
