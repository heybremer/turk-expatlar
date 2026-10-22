import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { BookOpen, Eye, MapPin, MessageCircle, MessagesSquare, ThumbsUp } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ForumTopic } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatRelative } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchBar } from "@/components/ui/SearchBar";
import { ChipRow, HeaderButton, MetaItem } from "@/components/ui/kit";
import { AppHeader, HeaderIconButton } from "@/components/navigation/AppHeader";

type Category = { id: string; name: string; slug: string };
type TopicsResponse = { items: ForumTopic[]; total: number; page: number; limit: number; totalPages: number };
type ForumSort = "newest" | "views" | "replies" | "likes";
type StatusFilter = "all" | "OPEN" | "ANSWERED" | "SOLVED";

const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: ForumSort; label: string }[] = [
  { value: "newest", label: "En yeni" },
  { value: "views", label: "En çok okunan" },
  { value: "replies", label: "En çok yorum" },
  { value: "likes", label: "En çok beğenilen" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tüm durumlar" },
  { value: "OPEN", label: "Cevap bekleyen" },
  { value: "ANSWERED", label: "Cevaplanan" },
  { value: "SOLVED", label: "Çözülen" },
];

const STATUS_LABELS: Record<string, { label: string; color: "primary" | "success" | "warning" | "muted" }> = {
  OPEN: { label: "Açık", color: "primary" },
  ANSWERED: { label: "Cevaplandı", color: "warning" },
  SOLVED: { label: "Çözüldü", color: "success" },
  LOCKED: { label: "Kilitli", color: "muted" },
  UNDER_REVIEW: { label: "İncelemede", color: "muted" },
};

function TopicRow({ topic }: { topic: ForumTopic }) {
  const router = useRouter();
  const status = STATUS_LABELS[topic.status] ?? STATUS_LABELS.OPEN;
  const author = topic.user?.profile?.displayName ?? "Anonim";
  return (
    <Card className="mb-3" onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}>
      <View className="flex-row items-center gap-2.5">
        <Avatar name={author} url={topic.user?.profile?.avatarUrl} size="sm" />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-text" numberOfLines={1}>
            {author}
          </Text>
          <Text className="text-xs text-muted">{formatRelative(topic.createdAt)}</Text>
        </View>
        <Badge label={status.label} color={status.color} />
      </View>

      <Text className="mt-3 text-[15px] font-bold leading-5 text-text" numberOfLines={2}>
        {topic.title}
      </Text>
      <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={2}>
        {topic.body}
      </Text>

      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
        {topic.category?.name ? <Badge label={topic.category.name} color="muted" /> : null}
        {topic.city?.name ? <MetaItem icon={MapPin} label={topic.city.name} /> : null}
        <MetaItem icon={MessageCircle} label={`${topic._count?.replies ?? 0} cevap`} />
        <MetaItem icon={Eye} label={String(topic.viewCount ?? 0)} />
        <MetaItem icon={ThumbsUp} label={String(topic._count?.interests ?? 0)} />
      </View>
    </Card>
  );
}

export default function ForumIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sort, setSort] = useState<ForumSort>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: categories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => api.get<Category[]>("/forum/categories", token),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!categorySlug || !categories) return;
    const match = categories.find((c) => c.slug === categorySlug);
    if (match) setActiveCat(match.id);
  }, [categorySlug, categories]);

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
    queryKey: ["forum-topics", activeCat, debouncedSearch, sort, statusFilter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) });
      if (activeCat !== "all") params.set("categoryId", activeCat);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sort !== "newest") params.set("sort", sort);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return api.get<TopicsResponse>(`/forum/topics?${params}`, token);
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: !!token,
  });

  const topics = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? []).flatMap((p) => p.items ?? []).filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [data]);
  const total = data?.pages[0]?.total ?? 0;

  const categoryOptions = useMemo(
    () => [{ value: "all", label: "Tümü" }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  );

  const hasFilter = activeCat !== "all" || debouncedSearch.length > 0 || statusFilter !== "all";

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title="Forum"
        subtitle="Sorular, deneyimler ve cevaplar"
        compact
        action={
          <>
            <HeaderIconButton
              icon={BookOpen}
              label="Forum kuralları"
              onPress={() => router.push("/(tabs)/forum/kurallar" as never)}
            />
            <HeaderButton label="Konu" onPress={() => router.push("/(tabs)/forum/yeni")} />
          </>
        }
      >
        <SearchBar value={search} onChangeText={setSearch} placeholder="Başlık veya içerikte ara…" />
        <ChipRow className="mt-3" options={categoryOptions} value={activeCat} onChange={setActiveCat} />
      </AppHeader>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : isError && topics.length === 0 ? (
        <ErrorState
          title="Forum yüklenemedi"
          subtitle={error instanceof ApiError ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
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
          ListHeaderComponent={
            <View className="mb-4 gap-2">
              <ChipRow options={SORT_OPTIONS} value={sort} onChange={setSort} />
              <ChipRow options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
              {total > 0 ? <Text className="mt-1 text-xs text-muted">{total} konu</Text> : null}
            </View>
          }
          renderItem={({ item }) => <TopicRow topic={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={MessagesSquare}
              title="Konu bulunamadı"
              subtitle={
                hasFilter
                  ? "Arama, kategori veya durum filtresini değiştirerek tekrar deneyin."
                  : "İlk soruyu sen sor, topluluk yardımcı olsun."
              }
              actionLabel={hasFilter ? "Filtreleri temizle" : "Yeni konu aç"}
              onAction={() => {
                if (hasFilter) {
                  setSearch("");
                  setActiveCat("all");
                  setStatusFilter("all");
                } else {
                  router.push("/(tabs)/forum/yeni");
                }
              }}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />
            ) : !hasNextPage && topics.length > PAGE_SIZE ? (
              <Text className="py-4 text-center text-xs text-muted">Tüm konular yüklendi</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}
