import { useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, Event } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { AppHeader } from "@/components/navigation/AppHeader";

type EventsResponse = { items: Event[]; total: number; page: number; totalPages: number };

function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const isPaid = event.priceType !== "FREE";
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}`)}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <Text className="font-bold text-text flex-1" numberOfLines={2}>{event.title}</Text>
          <Badge label={isPaid ? `€${event.priceAmount ?? "?"}` : "Ücretsiz"} color={isPaid ? "warning" : "success"} />
        </View>
        <Text className="text-sm text-muted" numberOfLines={2}>{event.description}</Text>
        <View className="mt-3 gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={13} color="#6b7280" />
            <Text className="text-xs text-muted">{formatDate(event.startsAt)}{event.endsAt ? ` → ${formatDate(event.endsAt)}` : ""}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={13} color="#6b7280" />
            <Text className="text-xs text-muted">{event.location} · {event.city.name}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="people-outline" size={13} color="#6b7280" />
            <Text className="text-xs text-muted">{event._count?.attendees ?? 0} katılımcı</Text>
          </View>
        </View>
        {event.category && (
          <View className="mt-2">
            <Badge label={event.category} color="primary" />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function EtkinliklerIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["events", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search.trim()) params.set("search", search.trim());
      return api.get<EventsResponse>(`/events?${params}`, token);
    },
    enabled: !!token,
  });

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-surface">
        <AppHeader
          title="Etkinlikler"
          subtitle="Yakındaki buluşmaları keşfet"
          compact
          action={
            <TouchableOpacity onPress={() => router.push("/(tabs)/etkinlikler/yeni")} className="rounded-xl bg-primary px-4 py-2">
              <Text className="text-sm font-semibold text-white">+ Ekle</Text>
            </TouchableOpacity>
          }
        />
        <View className="px-4 pb-3">
        <View className="bg-background rounded-xl px-3 py-2 border border-border flex-row items-center">
          <Ionicons name="search-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={(v) => { setSearch(v); setPage(1); }}
            placeholder="Etkinlik ara…"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-sm text-text"
          />
        </View>
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => <EventCard event={item} />}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="Etkinlik bulunamadı" />}
          ListFooterComponent={
            data ? <Pagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null
          }
        />
      )}
    </View>
  );
}
