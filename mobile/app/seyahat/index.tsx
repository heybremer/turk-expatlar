import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Euro, Inbox, Package, Plane, Weight } from "lucide-react-native";
import { api, CourierRequest, TravelAnnouncement } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { SearchBar } from "@/components/ui/SearchBar";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, HeaderButton, IconTile, MetaItem, Segmented, TipBox } from "@/components/ui/kit";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type Tab = "requests" | "announcements";
type Direction = "" | "DE_TO_TR" | "TR_TO_DE";
type StatusFilter = "OPEN" | "MATCHED,COMPLETED";
type Paged<T> = { items: T[]; total: number; page: number; limit: number };
type Item = CourierRequest | TravelAnnouncement;

const PAGE_SIZE = 20;

const TABS: { value: Tab; label: string }[] = [
  { value: "requests", label: "Eşya talepleri" },
  { value: "announcements", label: "Yolculuk ilanları" },
];
const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "", label: "Tüm yönler" },
  { value: "DE_TO_TR", label: "🇩🇪 → 🇹🇷" },
  { value: "TR_TO_DE", label: "🇹🇷 → 🇩🇪" },
];
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "OPEN", label: "Açık talepler" },
  { value: "MATCHED,COMPLETED", label: "Eşleşenler" },
];
const COURIER_STATUS: Record<string, { label: string; color: "success" | "primary" | "muted" }> = {
  OPEN: { label: "Açık", color: "success" },
  MATCHED: { label: "Eşleşti", color: "primary" },
  COMPLETED: { label: "Tamamlandı", color: "muted" },
  CANCELLED: { label: "İptal", color: "muted" },
  EXPIRED: { label: "Süresi doldu", color: "muted" },
};

const directionLabel = (d: string) => (d === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪");
const paymentLabel = (type: string, amount?: number | null) =>
  type === "FREE" ? "Ücretsiz" : type === "PAID" ? (amount ? `${amount} €` : "Ücretli") : "Pazarlık";

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function TravelScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("requests");
  const [direction, setDirection] = useState<Direction>("");
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search.trim());

  const query = useInfiniteQuery({
    queryKey: ["travel", tab, direction, tab === "requests" ? status : null, tab === "requests" ? debouncedSearch : null],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) });
      if (direction) params.set("direction", direction);
      if (tab === "requests") {
        params.set("status", status);
        if (debouncedSearch) params.set("search", debouncedSearch);
        return api.get<Paged<Item>>(`/courier/requests?${params}`);
      }
      return api.get<Paged<Item>>(`/travel-announcements?${params}`);
    },
    getNextPageParam: (last) => {
      const limit = last.limit || PAGE_SIZE;
      return last.page * limit < last.total ? last.page + 1 : undefined;
    },
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items ?? []) ?? [], [query.data]);
  const createHref = tab === "requests" ? "/seyahat/yeni" : "/seyahat/yolculuk/yeni";

  return (
    <Screen
      scroll={false}
      header={
        <DetailHeader
          title="Seyahat"
          subtitle="Türkiye–Almanya arası taşıma topluluğu"
          action={<HeaderButton label="İlan ver" onPress={() => router.push(createHref as never)} />}
        >
          <Segmented options={TABS} value={tab} onChange={setTab} />
          <ChipRow className="mt-3" options={DIRECTIONS} value={direction} onChange={setDirection} />
        </DetailHeader>
      }
    >
      <FlatList<Item>
        data={query.isLoading || query.isError ? [] : items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View className="h-3" />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            {tab === "requests" ? (
              <>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Eşya veya şehir ara…" />
                <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
              </>
            ) : null}
            <TipBox tone="warning" title="Güvenli taşıma">
              Yasaklı, ticari veya beyan edilmemiş eşya taşımayın. Ödeme ve teslim ayrıntılarını açıkça konuşun.
            </TipBox>
          </View>
        }
        renderItem={({ item }) =>
          tab === "requests" ? (
            <CourierCard item={item as CourierRequest} onPress={() => router.push(`/seyahat/${item.id}` as never)} />
          ) : (
            <AnnouncementCard
              item={item as TravelAnnouncement}
              onPress={() => router.push(`/seyahat/yolculuk/${item.id}` as never)}
            />
          )
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View className="-mx-4">
              <SkeletonList count={4} />
            </View>
          ) : query.isError ? (
            <ErrorState
              title="Seyahat ilanları yüklenemedi"
              subtitle={query.error instanceof Error ? query.error.message : undefined}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <EmptyState
              icon={tab === "requests" ? (status === "OPEN" ? Package : Inbox) : Plane}
              title="Henüz ilan yok"
              subtitle={
                debouncedSearch && tab === "requests"
                  ? "Aramana uygun talep bulunamadı."
                  : "Bu yöndeki ilk ilanı sen oluşturabilirsin."
              }
              actionLabel="İlan ver"
              onAction={() => router.push(createHref as never)}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function CourierCard({ item, onPress }: { item: CourierRequest; onPress: () => void }) {
  const st = COURIER_STATUS[item.status] ?? { label: item.status, color: "muted" as const };
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <IconTile icon={Package} tint={colors.warning} />
        <View className="flex-1">
          <Text className="text-base font-bold text-text" numberOfLines={1}>
            {item.itemName}
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <Text className="shrink text-sm text-muted" numberOfLines={1}>
              {item.fromArea}
            </Text>
            <ArrowRight size={13} color={colors.mutedLight} />
            <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
              {item.toArea}
            </Text>
          </View>
        </View>
        <Badge label={st.label} color={st.color} />
      </View>
      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <Badge label={directionLabel(item.direction)} color="primary" />
        {item.weightKg != null ? <MetaItem icon={Weight} label={`${item.weightKg} kg`} /> : null}
        <MetaItem icon={Euro} label={paymentLabel(item.paymentType, item.paymentAmount)} />
        {item.preferredDate ? <MetaItem icon={CalendarDays} label={formatDate(item.preferredDate)} /> : null}
      </View>
    </Card>
  );
}

function AnnouncementCard({ item, onPress }: { item: TravelAnnouncement; onPress: () => void }) {
  const requestCount = item._count?.requests ?? item.requestCount ?? 0;
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <IconTile icon={Plane} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="shrink text-base font-bold text-text" numberOfLines={1}>
              {item.fromCity}
            </Text>
            <ArrowRight size={15} color={colors.muted} />
            <Text className="flex-1 text-base font-bold text-text" numberOfLines={1}>
              {item.toCity}
            </Text>
          </View>
          <View className="mt-1">
            <MetaItem icon={CalendarDays} label={formatDate(item.departureDate)} />
          </View>
        </View>
      </View>
      {item.notes ? (
        <Text className="mt-3 text-sm leading-5 text-muted" numberOfLines={2}>
          {item.notes}
        </Text>
      ) : null}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Badge label={directionLabel(item.direction)} color="primary" />
        {item.availableKg != null ? <Badge label={`${item.availableKg} kg boş`} icon={Weight} color="muted" /> : null}
        {requestCount > 0 ? <Badge label={`${requestCount} teklif`} color="accent" /> : null}
        {item.user?.profile?.displayName ? (
          <Text className="ml-auto text-xs text-muted" numberOfLines={1}>
            {item.user.profile.displayName}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
