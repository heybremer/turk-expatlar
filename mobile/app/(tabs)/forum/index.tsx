import { useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ForumTopic } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { AppHeader } from "@/components/navigation/AppHeader";

type Category = { id: string; name: string; slug: string; _count?: { topics: number } };
type TopicsResponse = { items: ForumTopic[]; total: number; page: number; totalPages: number };
type ForumSort = "newest" | "views" | "replies" | "likes";

const SORT_OPTIONS: { value: ForumSort; label: string }[] = [
  { value: "newest", label: "En yeni" },
  { value: "views", label: "En çok okunan" },
  { value: "replies", label: "En çok yorum" },
  { value: "likes", label: "En çok beğenilen" },
];

const STATUS_LABELS: Record<string, { label: string; color: "primary" | "success" | "warning" | "muted" }> = {
  OPEN: { label: "Açık", color: "primary" },
  ANSWERED: { label: "Cevaplandı", color: "warning" },
  SOLVED: { label: "Çözüldü", color: "success" },
  LOCKED: { label: "Kilitli", color: "muted" },
};

function TopicRow({ topic }: { topic: ForumTopic }) {
  const router = useRouter();
  const status = STATUS_LABELS[topic.status] ?? STATUS_LABELS.OPEN;
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}>
      <Card className="mb-2">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Badge label={topic.category.name} color="muted" />
          <Badge label={status.label} color={status.color} />
        </View>
        <Text className="mt-2 font-semibold text-text" numberOfLines={2}>{topic.title}</Text>
        <Text className="mt-1 text-xs text-muted" numberOfLines={2}>{topic.body}</Text>
        <View className="mt-2 flex-row items-center gap-3 flex-wrap">
          <View className="flex-row items-center gap-1">
            <Ionicons name="eye-outline" size={12} color="#6b7280" />
            <Text className="text-xs text-muted">{topic.viewCount ?? 0}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="chatbubble-outline" size={12} color="#6b7280" />
            <Text className="text-xs text-muted">{topic._count?.replies ?? 0} cevap</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="hand-left-outline" size={12} color="#6b7280" />
            <Text className="text-xs text-muted">{topic._count?.interests ?? 0}</Text>
          </View>
          <Text className="text-xs text-muted">·</Text>
          <Text className="text-xs text-muted" numberOfLines={1}>{topic.user?.profile?.displayName ?? "Anonim"}</Text>
          <Text className="text-xs text-muted">·</Text>
          <Text className="text-xs text-muted">{formatRelative(topic.createdAt)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function ForumIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sort, setSort] = useState<ForumSort>("newest");
  const [page, setPage] = useState(1);

  // Not: Konudan geri dönüldüğünde filtre/arama/sıralama korunur; kullanıcı
  // kaldığı yerden devam eder. (Önceki sıfırlama davranışı bağlam kaybettiriyordu.)

  const { data: categories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => api.get<Category[]>("/forum/categories", token),
    enabled: !!token,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["forum-topics", activeCat, search, sort, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (activeCat !== "all") params.set("categoryId", activeCat);
      if (search.trim()) params.set("search", search.trim());
      if (sort !== "newest") params.set("sort", sort);
      return api.get<TopicsResponse>(`/forum/topics?${params}`, token);
    },
    enabled: !!token,
  });

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-surface">
        <AppHeader
          title="Forum"
          subtitle="Sorular, deneyimler ve cevaplar"
          compact
          action={
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/forum/kurallar" as never)}
                className="rounded-xl border border-border px-3 py-2"
              >
                <Ionicons name="document-text-outline" size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/forum/yeni")}
                className="rounded-xl bg-primary px-4 py-2"
              >
                <Text className="text-sm font-semibold text-white">+ Konu</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Arama - app bar'dan ayrık, kendi bölümünde */}
      <View className="bg-background px-4 pt-3 pb-1">
        <SearchBar
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(1); }}
          placeholder="Konu, kategori veya kullanıcı ara…"
        />
      </View>

      {/* Sıralama */}
      <View className="bg-surface border-b border-border">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => { setSort(option.value); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 border ${sort === option.value ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <Text className={`text-xs font-medium ${sort === option.value ? "text-primary" : "text-muted"}`}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          <TouchableOpacity
            onPress={() => { setActiveCat("all"); setPage(1); }}
            className={`rounded-full px-4 py-2 ${activeCat === "all" ? "bg-primary" : "bg-background border border-border"}`}
          >
            <Text className={`text-sm font-medium ${activeCat === "all" ? "text-white" : "text-muted"}`}>Tümü</Text>
          </TouchableOpacity>
          {categories?.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => { setActiveCat(cat.id); setPage(1); }}
              className={`rounded-full px-4 py-2 ${activeCat === cat.id ? "bg-primary" : "bg-background border border-border"}`}
            >
              <Text className={`text-sm font-medium ${activeCat === cat.id ? "text-white" : "text-muted"}`}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => <TopicRow topic={item} />}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="Konu bulunamadı" />}
          ListFooterComponent={
            data ? <Pagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null
          }
        />
      )}
    </View>
  );
}
