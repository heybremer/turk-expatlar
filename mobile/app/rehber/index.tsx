import { useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, Business } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { StarRating } from "@/components/ui/StarRating";
import { BackButton } from "@/components/ui/BackButton";

type BusinessesResponse = { items: Business[]; total: number; page: number; totalPages: number };

function BusinessCard({ biz }: { biz: Business }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/rehber/${biz.id}`)}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between gap-2 mb-1">
          <Text className="font-bold text-text flex-1" numberOfLines={1}>{biz.name}</Text>
          {biz.isVerified && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
              <Text className="text-xs text-success font-medium">Doğrulandı</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-muted mb-2">{biz.category.name} · {biz.city.name}</Text>
        <Text className="text-sm text-muted" numberOfLines={2}>{biz.description}</Text>
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <StarRating rating={biz.averageRating} size={12} />
            <Text className="text-xs text-muted">{biz.averageRating.toFixed(1)} ({biz.reviewCount})</Text>
          </View>
          {biz.speaksTurkish && <Badge label="🇹🇷 Türkçe" color="primary" />}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function RehberIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["businesses", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      return api.get<BusinessesResponse>(`/businesses?${params}`, token);
    },
    enabled: !!token,
  });

  return (
    <View className="flex-1 bg-background">
      <View className="bg-surface border-b border-border px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center gap-3 mb-3">
          <BackButton />
          <Text className="flex-1 text-xl font-bold text-text" numberOfLines={1}>İşletme Rehberi</Text>
          <TouchableOpacity onPress={() => router.push("/rehber/yeni")} className="bg-primary rounded-xl px-4 py-2">
            <Text className="text-white text-sm font-semibold">+ Ekle</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-background rounded-xl px-3 py-2 border border-border flex-row items-center">
          <Ionicons name="search-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
          <TextInput value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} placeholder="İşletme ara…" placeholderTextColor="#9ca3af" className="flex-1 text-sm text-text" />
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => <BusinessCard biz={item} />}
          ListEmptyComponent={<EmptyState icon="storefront-outline" title="İşletme bulunamadı" />}
        />
      )}
    </View>
  );
}
