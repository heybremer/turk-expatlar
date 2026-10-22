import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { CalendarDays, Clock, MapPin, Users, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Event, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ChipRow, HeaderButton, MetaItem } from "@/components/ui/kit";
import { AppHeader } from "@/components/navigation/AppHeader";

type EventsResponse = { items: Event[]; total: number; page: number; limit: number };
type When = "upcoming" | "thisWeek";
type Price = "all" | "FREE" | "PAID";

const PAGE_SIZE = 15;

const EVENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "bulusma", label: "Buluşma" },
  { value: "networking", label: "Networking" },
  { value: "yeni-gelenler", label: "Yeni gelenler" },
  { value: "dil-degisimi", label: "Dil değişimi" },
  { value: "aile", label: "Aile" },
  { value: "cocuk", label: "Çocuk" },
  { value: "spor", label: "Spor" },
  { value: "kultur-sanat", label: "Kültür & sanat" },
  { value: "ogrenci", label: "Öğrenci" },
  { value: "girisimci", label: "Girişimci" },
  { value: "seminer", label: "Seminer" },
  { value: "online", label: "Online" },
];

const CATEGORY_LABEL = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.value, c.label]));

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const isPaid = event.priceType === "PAID";
  const start = new Date(event.startsAt);
  const valid = !Number.isNaN(start.getTime());
  const cancelled = event.status === "CANCELLED";
  const attendees = event._count?.attendees ?? 0;
  const isFull = !!event.capacity && attendees >= event.capacity;
  const place = [event.city?.name, event.location].filter(Boolean).join(" · ");

  return (
    <Card className="mb-3" onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}`)}>
      <View className="flex-row gap-3.5">
        <View className="h-16 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Text className="text-xl font-extrabold leading-6 text-primary">{valid ? start.getDate() : "–"}</Text>
          <Text className="text-[11px] font-bold uppercase text-primary">
            {valid ? MONTHS_SHORT[start.getMonth()] : ""}
          </Text>
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-bold leading-5 text-text" numberOfLines={2}>
            {event.title}
          </Text>
          <View className="mt-2 gap-1.5">
            {place ? <MetaItem icon={MapPin} label={place} /> : null}
            {valid ? (
              <MetaItem icon={Clock} label={`${pad(start.getHours())}:${pad(start.getMinutes())}`} />
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2 border-t border-border pt-3">
        <Badge label={isPaid ? `€${event.priceAmount ?? "?"}` : "Ücretsiz"} color={isPaid ? "warning" : "success"} />
        {event.category ? <Badge label={CATEGORY_LABEL[event.category] ?? event.category} color="primary" /> : null}
        {cancelled ? <Badge label="İptal" color="danger" /> : isFull ? <Badge label="Dolu" color="warning" /> : null}
        <View className="ml-auto">
          <MetaItem
            icon={Users}
            label={event.capacity ? `${attendees}/${event.capacity} katılımcı` : `${attendees} katılımcı`}
          />
        </View>
      </View>
    </Card>
  );
}

export default function EtkinliklerIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const [when, setWhen] = useState<When>("upcoming");
  const [price, setPrice] = useState<Price>("all");
  const [category, setCategory] = useState("all");
  const [stateId, setStateId] = useState("all");
  const [cityId, setCityId] = useState("all");

  const { data: states } = useQuery({
    queryKey: ["locations-states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
    staleTime: 60 * 60 * 1000,
  });
  const selectedState = states?.find((s) => s.id === stateId);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["events", when, price, category, stateId, cityId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) });
      if (when === "thisWeek") params.set("thisWeek", "true");
      if (price !== "all") params.set("priceType", price);
      if (category !== "all") params.set("category", category);
      if (stateId !== "all") params.set("stateId", stateId);
      if (cityId !== "all") params.set("cityId", cityId);
      return api.get<EventsResponse>(`/events?${params}`, token);
    },
    getNextPageParam: (last) => {
      const limit = last.limit || PAGE_SIZE;
      return last.page * limit < last.total ? last.page + 1 : undefined;
    },
    enabled: !!token,
  });

  const events = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? []).flatMap((p) => p.items ?? []).filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [data]);
  const total = data?.pages[0]?.total ?? 0;

  const activeFilterCount =
    (when !== "upcoming" ? 1 : 0) +
    (price !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (stateId !== "all" ? 1 : 0);

  function clearFilters() {
    setWhen("upcoming");
    setPrice("all");
    setCategory("all");
    setStateId("all");
    setCityId("all");
  }

  const filters = (
    <View className="mb-4 gap-2">
      <ChipRow
        options={[
          { value: "upcoming", label: "Yaklaşan" },
          { value: "thisWeek", label: "Bu hafta" },
        ]}
        value={when}
        onChange={setWhen}
      />
      <ChipRow
        options={[
          { value: "all", label: "Tüm fiyatlar" },
          { value: "FREE", label: "Ücretsiz" },
          { value: "PAID", label: "Ücretli" },
        ]}
        value={price}
        onChange={setPrice}
      />
      <ChipRow options={[{ value: "all", label: "Tüm kategoriler" }, ...EVENT_CATEGORIES]} value={category} onChange={setCategory} />
      <ChipRow
        options={[{ value: "all", label: "Tüm eyaletler" }, ...(states ?? []).map((s) => ({ value: s.id, label: s.name }))]}
        value={stateId}
        onChange={(v) => {
          setStateId(v);
          setCityId("all");
        }}
      />
      {selectedState ? (
        <ChipRow
          options={[
            { value: "all", label: `Tüm ${selectedState.name}` },
            ...selectedState.cities.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={cityId}
          onChange={setCityId}
        />
      ) : null}
      <View className="mt-1 min-h-8 flex-row items-center justify-between">
        <Text className="text-xs text-muted">{isLoading ? " " : `${total} etkinlik bulundu`}</Text>
        {activeFilterCount > 0 ? (
          <Pressable
            onPress={clearFilters}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Filtreleri temizle"
            className="min-h-8 flex-row items-center gap-1 rounded-full bg-danger/10 px-3 active:opacity-70"
          >
            <X size={12} color={colors.danger} />
            <Text className="text-xs font-semibold text-danger">Temizle ({activeFilterCount})</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title="Etkinlikler"
        subtitle="Yakındaki buluşmaları keşfet"
        compact
        action={<HeaderButton label="Ekle" onPress={() => router.push("/(tabs)/etkinlikler/yeni")} />}
      />

      {isLoading ? (
        <View className="flex-1">
          <View className="px-4 pt-4">{filters}</View>
          <SkeletonList count={4} />
        </View>
      ) : isError && events.length === 0 ? (
        <ErrorState
          title="Etkinlikler yüklenemedi"
          subtitle={error instanceof ApiError ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          ListHeaderComponent={filters}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          renderItem={({ item }) => <EventCard event={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={CalendarDays}
              title="Etkinlik bulunamadı"
              subtitle={
                activeFilterCount > 0
                  ? "Farklı filtreler deneyin veya filtreleri temizleyin."
                  : "Yakınında henüz etkinlik yok. İlk buluşmayı sen organize et."
              }
              actionLabel={activeFilterCount > 0 ? "Filtreleri temizle" : "Etkinlik oluştur"}
              onAction={activeFilterCount > 0 ? clearFilters : () => router.push("/(tabs)/etkinlikler/yeni")}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} /> : null
          }
        />
      )}
    </View>
  );
}
