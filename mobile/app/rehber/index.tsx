import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Languages, MapPin, Store, type LucideIcon } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, Business, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { StarRating } from "@/components/ui/StarRating";
import { SearchBar } from "@/components/ui/SearchBar";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, HeaderButton, IconTile, MetaItem } from "@/components/ui/kit";
import { DetailHeader } from "@/components/navigation/DetailHeader";

const PAGE_SIZE = 20;

type BusinessesResponse = { items: Business[]; total: number; page: number; limit: number };
type Category = { id: string; name: string; slug: string };

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ToggleChip({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      className={`min-h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
        active ? "border-primary bg-primary/10" : "border-border bg-surface"
      }`}
    >
      <Icon size={14} color={active ? colors.primary : colors.muted} />
      <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-muted"}`}>{label}</Text>
    </Pressable>
  );
}

function BusinessCard({ biz }: { biz: Business }) {
  const router = useRouter();
  const rating = Number(biz.averageRating ?? 0);
  return (
    <Card className="mb-3" onPress={() => router.push(`/rehber/${biz.id}`)}>
      <View className="flex-row items-start gap-3">
        <IconTile icon={Store} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-1 text-base font-bold text-text" numberOfLines={1}>
              {biz.name}
            </Text>
            {biz.isVerified ? <BadgeCheck size={17} color={colors.success} /> : null}
          </View>
          <View className="mt-1">
            <MetaItem
              icon={MapPin}
              label={[biz.category?.name, biz.city?.name].filter(Boolean).join(" · ")}
            />
          </View>
        </View>
      </View>
      {biz.description ? (
        <Text className="mt-3 text-sm leading-5 text-muted" numberOfLines={2}>
          {biz.description}
        </Text>
      ) : null}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <View className="flex-row items-center gap-1.5">
          <StarRating rating={rating} size={12} />
          <Text className="text-xs font-semibold text-text">{rating.toFixed(1)}</Text>
          <Text className="text-xs text-muted">({biz.reviewCount ?? 0})</Text>
        </View>
        {biz.speaksTurkish ? <Badge label="Türkçe" icon={Languages} color="primary" /> : null}
      </View>
    </Card>
  );
}

export default function RehberIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [speaksTurkish, setSpeaksTurkish] = useState(false);
  const [verified, setVerified] = useState(false);
  const debouncedSearch = useDebounced(search.trim());

  const { data: categories } = useQuery({
    queryKey: ["biz-categories"],
    queryFn: () => api.get<Category[]>("/businesses/categories"),
    staleTime: 10 * 60 * 1000,
  });
  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states"),
    staleTime: 60 * 60 * 1000,
  });

  const query = useInfiniteQuery({
    queryKey: ["businesses", { search: debouncedSearch, categoryId, stateId, speaksTurkish, verified }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId) params.set("categoryId", categoryId);
      if (stateId) params.set("stateId", stateId);
      if (speaksTurkish) params.set("speaksTurkish", "true");
      if (verified) params.set("verified", "true");
      return api.get<BusinessesResponse>(`/businesses?${params}`, token);
    },
    getNextPageParam: (last) => {
      const limit = last.limit || PAGE_SIZE;
      return last.page * limit < last.total ? last.page + 1 : undefined;
    },
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items ?? []) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total;
  const hasFilters = Boolean(debouncedSearch || categoryId || stateId || speaksTurkish || verified);

  const categoryOptions = [
    { value: "", label: "Tümü" },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const stateOptions = [
    { value: "", label: "Tüm eyaletler" },
    ...(states ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    setStateId("");
    setSpeaksTurkish(false);
    setVerified(false);
  };

  return (
    <Screen
      scroll={false}
      header={
        <DetailHeader
          title="İşletme Rehberi"
          subtitle={total !== undefined ? `${total} işletme` : "Türkçe hizmet veren işletmeler"}
          action={<HeaderButton label="Ekle" onPress={() => router.push("/rehber/yeni")} />}
        >
          <SearchBar value={search} onChangeText={setSearch} placeholder="İşletme veya hizmet ara…" />
          <ChipRow className="mt-3" options={categoryOptions} value={categoryId} onChange={setCategoryId} />
        </DetailHeader>
      }
    >
      <FlatList
        data={query.isLoading || query.isError ? [] : items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <ToggleChip
                label="Türkçe konuşuluyor"
                icon={Languages}
                active={speaksTurkish}
                onPress={() => setSpeaksTurkish((v) => !v)}
              />
              <ToggleChip
                label="Doğrulanmış"
                icon={BadgeCheck}
                active={verified}
                onPress={() => setVerified((v) => !v)}
              />
            </ScrollView>
            <ChipRow options={stateOptions} value={stateId} onChange={setStateId} />
          </View>
        }
        renderItem={({ item }) => <BusinessCard biz={item} />}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="-mx-4">
              <SkeletonList count={4} />
            </View>
          ) : query.isError ? (
            <ErrorState
              subtitle={query.error instanceof Error ? query.error.message : undefined}
              onRetry={() => void query.refetch()}
            />
          ) : hasFilters ? (
            <EmptyState
              icon={Store}
              title="Sonuç bulunamadı"
              subtitle="Bu filtrelere uygun işletme yok."
              actionLabel="Filtreleri temizle"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState
              icon={Store}
              title="Henüz işletme yok"
              subtitle="Bildiğin bir Türk işletmesini rehbere ekle."
              actionLabel="İşletme ekle"
              onAction={() => router.push("/rehber/yeni")}
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
