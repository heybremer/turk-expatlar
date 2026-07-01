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
import { AppHeader } from "@/components/navigation/AppHeader";

type Category = { id: string; name: string; slug: string; _count?: { topics: number } };
type TopicsResponse = { items: ForumTopic[]; total: number; page: number; totalPages: number };

function TopicRow({ topic }: { topic: ForumTopic }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}>
      <Card className="mb-2">
        <Text className="font-semibold text-text" numberOfLines={2}>{topic.title}</Text>
        <Text className="mt-1 text-xs text-muted" numberOfLines={2}>{topic.body}</Text>
        <View className="mt-2 flex-row items-center gap-2 flex-wrap">
          <Badge label={topic.category.name} color="primary" />
          <Text className="text-xs text-muted">{topic._count?.replies ?? 0} cevap</Text>
          <Text className="text-xs text-muted">·</Text>
          <Text className="text-xs text-muted">{topic.user?.profile?.displayName ?? "Anonim"}</Text>
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
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => api.get<Category[]>("/forum/categories", token),
    enabled: !!token,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["forum-topics", activeCat, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (activeCat !== "all") params.set("categoryId", activeCat);
      if (search.trim()) params.set("search", search.trim());
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
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/forum/yeni")}
              className="rounded-xl bg-primary px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">+ Konu</Text>
            </TouchableOpacity>
          }
        />
        <View className="px-4 pb-3">
        <View className="bg-background rounded-xl px-3 py-2 border border-border flex-row items-center">
          <Ionicons name="search-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={(v) => { setSearch(v); setPage(1); }}
            placeholder="Konu ara…"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-sm text-text"
          />
        </View>
        </View>
      </View>

      {/* Category Chips */}
      <View className="bg-surface border-b border-border">
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
