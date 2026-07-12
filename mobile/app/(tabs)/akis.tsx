import { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, HomeFeed, ForumTopic, Event, Business } from "@/lib/api";
import { formatRelative, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppHeader } from "@/components/navigation/AppHeader";

function SectionHeader({ title, onMore }: { title: string; onMore?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-base font-bold text-text">{title}</Text>
      {onMore && (
        <TouchableOpacity onPress={onMore} className="flex-row items-center gap-1">
          <Text className="text-sm text-primary">Tümü</Text>
          <Ionicons name="chevron-forward" size={14} color="#1a56db" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function TopicCard({ topic }: { topic: ForumTopic }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="font-semibold text-text" numberOfLines={2}>{topic.title}</Text>
            <Text className="mt-1 text-xs text-muted" numberOfLines={2}>{topic.body}</Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center gap-2 flex-wrap">
          <Badge label={topic.category.name} color="primary" />
          <Text className="text-xs text-muted">{topic._count?.replies ?? 0} cevap</Text>
          <Text className="text-xs text-muted">· {formatRelative(topic.createdAt)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}`)}>
      <Card className="mb-3">
        <Text className="font-semibold text-text" numberOfLines={1}>{event.title}</Text>
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="location-outline" size={12} color="#6b7280" />
          <Text className="text-xs text-muted">{event.city.name}</Text>
        </View>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={12} color="#6b7280" />
          <Text className="text-xs text-muted">{formatDate(event.startsAt)}</Text>
        </View>
        <View className="mt-2 flex-row gap-2">
          <Badge label={event.priceType === "FREE" ? "Ücretsiz" : "Ücretli"} color={event.priceType === "FREE" ? "success" : "primary"} />
          <Badge label={`${event._count?.attendees ?? 0} katılımcı`} color="muted" />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/rehber/${business.id}`)}>
      <Card className="mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-text flex-1" numberOfLines={1}>{business.name}</Text>
          {business.isVerified && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text className="text-xs text-success">Doğrulandı</Text>
            </View>
          )}
        </View>
        <Text className="mt-1 text-xs text-muted">{business.category.name} · {business.city.name}</Text>
        {business.speaksTurkish && (
          <Text className="mt-1 text-xs text-primary">🇹🇷 Türkçe konuşuyor</Text>
        )}
        <View className="mt-2 flex-row items-center gap-1.5">
          <StarRating rating={business.averageRating} size={12} />
          <Text className="text-xs text-muted">{business.averageRating.toFixed(1)} ({business.reviewCount})</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

type FeedItem =
  | { type: "topic"; data: ForumTopic; key: string }
  | { type: "event"; data: Event; key: string }
  | { type: "business"; data: Business; key: string }
  | { type: "section-forum"; key: string }
  | { type: "section-events"; key: string }
  | { type: "section-businesses"; key: string };

export default function AkisScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["home-feed"],
    queryFn: () => api.get<HomeFeed>("/feed/home", token),
    enabled: !!token,
  });

  const buildList = useCallback((): FeedItem[] => {
    if (!data) return [];
    const items: FeedItem[] = [];

    if (data.topics.length > 0) {
      items.push({ type: "section-forum", key: "sh-forum" });
      data.topics.slice(0, 3).forEach((t) => items.push({ type: "topic", data: t, key: `t-${t.id}` }));
    }
    if (data.events.length > 0) {
      items.push({ type: "section-events", key: "sh-events" });
      data.events.slice(0, 3).forEach((e) => items.push({ type: "event", data: e, key: `e-${e.id}` }));
    }
    if (data.businesses.length > 0) {
      items.push({ type: "section-businesses", key: "sh-biz" });
      data.businesses.slice(0, 3).forEach((b) => items.push({ type: "business", data: b, key: `b-${b.id}` }));
    }
    return items;
  }, [data]);

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader title="Türk Expatlar" subtitle="Almanya'daki Türk topluluğu" />
        <ErrorState title="Akış yüklenemedi" onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Türk Expatlar" subtitle="Almanya'daki Türk topluluğu" />

      <FlatList
        data={buildList()}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
        ListEmptyComponent={
          <EmptyState
            icon="newspaper-outline"
            title="Henüz içerik yok"
            subtitle="Forum konuları, etkinlikler ve işletmeler burada görünecek."
          />
        }
        renderItem={({ item }) => {
          if (item.type === "section-forum") {
            return <SectionHeader title="Son Forum Konuları" onMore={() => router.push("/(tabs)/forum")} />;
          }
          if (item.type === "section-events") {
            return <SectionHeader title="Yaklaşan Etkinlikler" onMore={() => router.push("/(tabs)/etkinlikler")} />;
          }
          if (item.type === "section-businesses") {
            return <SectionHeader title="Öne Çıkan İşletmeler" onMore={() => router.push("/rehber")} />;
          }
          if (item.type === "topic") return <TopicCard topic={item.data} />;
          if (item.type === "event") return <EventCard event={item.data} />;
          if (item.type === "business") return <BusinessCard business={item.data} />;
          return null;
        }}
      />
    </View>
  );
}
