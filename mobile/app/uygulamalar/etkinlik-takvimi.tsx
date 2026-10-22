import { CalendarDays, ChevronRight, Clock, ExternalLink, MapPin, Tag, Users } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Linking, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { DetailHeader, Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { SearchBar } from "@/components/ui/SearchBar";
import { ChipRow, MetaItem, SectionLabel } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { colors } from "@/lib/colors";

type CalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  city: string;
  venue?: string;
  cost?: string;
  category?: string;
  imageUrl?: string;
  artist?: string;
  ticketUrl?: string;
  detailUrl: string;
  source: "eventturk" | "platform";
};
type CalendarResponse = { items: CalendarEvent[]; total: number; cities: string[]; categories: string[] };

const ALL = "Almanya";

const safeDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("tr-TR", opts).format(d);

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function EventCalendarScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState(ALL);
  const [category, setCategory] = useState("");
  const debouncedSearch = useDebounced(search.trim());

  const query = useQuery({
    queryKey: ["event-calendar", city, category, debouncedSearch],
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    queryFn: () => {
      const params = new URLSearchParams();
      if (city !== ALL) params.set("city", city);
      if (category) params.set("category", category);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api.get<CalendarResponse>(`/event-calendar/events?${params}`);
    },
  });
  const data = query.data;

  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([{ value: ALL, label: "Tüm Almanya" }]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (!data) return;
    if (data.cities?.length) setCityOptions([{ value: ALL, label: "Tüm Almanya" }, ...data.cities.map((c) => ({ value: c, label: c }))]);
    if (data.categories?.length) setCategoryOptions([{ value: "", label: "Tüm türler" }, ...data.categories.map((c) => ({ value: c, label: c }))]);
  }, [data]);

  const items = useMemo(() => (data?.items ?? []).filter((e) => safeDate(e.startDate)), [data]);

  const openEvent = (event: CalendarEvent) => {
    if (event.source === "platform") {
      const id = event.detailUrl.split("/").pop();
      if (id) router.push(`/(tabs)/etkinlikler/${id}` as never);
      return;
    }
    const url = event.ticketUrl ?? event.detailUrl;
    if (/^https?:\/\//.test(url)) void Linking.openURL(url);
  };

  return (
    <Screen
      scroll={false}
      header={
        <DetailHeader title="Etkinlik Takvimi" subtitle="Almanya'daki Türk etkinlikleri">
          <SearchBar value={search} onChangeText={setSearch} placeholder="Etkinlik, sanatçı veya mekân ara" />
          <ChipRow className="mt-3" options={cityOptions} value={city} onChange={setCity} />
        </DetailHeader>
      }
    >
      <FlatList
        data={query.isLoading || (query.isError && !data) ? [] : items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        ItemSeparatorComponent={() => <View className="h-3" />}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {categoryOptions.length > 1 ? (
              <ChipRow className="mb-1" options={categoryOptions} value={category} onChange={setCategory} />
            ) : null}
            {data && items.length > 0 ? <SectionLabel count={data.total}>Etkinlikler</SectionLabel> : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View className="-mx-4">
              <SkeletonList count={5} />
            </View>
          ) : query.isError ? (
            <ErrorState
              title="Etkinlikler yüklenemedi"
              subtitle={query.error instanceof Error ? query.error.message : undefined}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Etkinlik bulunamadı"
              subtitle="Arama, şehir veya tür filtresini değiştirmeyi dene."
            />
          )
        }
        renderItem={({ item: event }) => {
          const start = safeDate(event.startDate)!;
          const isPlatform = event.source === "platform";
          const footer = event.cost ?? event.category ?? (isPlatform ? "Topluluk etkinliği" : "Detayları incele");
          return (
            <Card padded={false} onPress={() => openEvent(event)}>
              {event.imageUrl ? (
                <Image
                  source={{ uri: event.imageUrl }}
                  style={{ width: "100%", height: 150, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View className="p-4">
                <View className="flex-row items-start gap-4">
                  <View className="w-14 items-center rounded-2xl bg-primary-50 px-2 py-2.5">
                    <Text className="text-xs font-extrabold uppercase text-primary-600">{fmt(start, { month: "short" })}</Text>
                    <Text className="text-2xl font-black text-primary-950">{start.getDate()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold leading-6 text-text" numberOfLines={3}>
                      {event.title}
                    </Text>
                    <View className="mt-2 gap-1">
                      <MetaItem
                        icon={Clock}
                        label={fmt(start, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      />
                      <MetaItem icon={MapPin} label={[event.venue, event.city].filter(Boolean).join(" · ")} />
                      {event.artist ? <MetaItem icon={Users} label={event.artist} /> : null}
                    </View>
                  </View>
                </View>
                <View className="mt-3 flex-row items-center gap-2 border-t border-border pt-3">
                  <View className="flex-1">
                    <MetaItem icon={Tag} label={footer} />
                  </View>
                  {isPlatform ? (
                    <ChevronRight size={16} color={colors.primary} />
                  ) : (
                    <ExternalLink size={16} color={colors.primary} />
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
