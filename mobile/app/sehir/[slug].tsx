import { useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Store,
  Users,
} from "lucide-react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { StarRating } from "@/components/ui/StarRating";
import { IconTile, MetaItem, SectionHeader } from "@/components/ui/kit";
import { api, ApiError, Business, Event, ForumTopic } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate, formatRelative } from "@/lib/utils";

type CityResponse = {
  city: { id: string; name: string; slug: string; state?: { name: string; slug: string } | null };
  events?: Event[];
  topics?: ForumTopic[];
  businesses?: Business[];
  stats?: { topicCount: number; businessCount: number };
};

export default function CityScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const city = useQuery({
    queryKey: ["city", slug],
    queryFn: () => api.get<CityResponse>(`/locations/cities/${encodeURIComponent(slug ?? "")}`),
    enabled: !!slug,
  });

  if (city.isLoading) {
    return (
      <Screen title="Şehir" scroll={false}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (!city.data?.city) {
    return (
      <Screen title="Şehir" scroll={false}>
        <ErrorState
          title="Şehir yüklenemedi"
          subtitle={city.error instanceof ApiError ? city.error.message : undefined}
          onRetry={() => void city.refetch()}
        />
      </Screen>
    );
  }

  const data = city.data;
  const events = data.events ?? [];
  const topics = data.topics ?? [];
  const businesses = data.businesses ?? [];
  const stateName = data.city.state?.name ?? "";

  return (
    <Screen
      title={data.city.name}
      subtitle={stateName || undefined}
      refreshControl={
        <RefreshControl
          refreshing={city.isRefetching}
          onRefresh={() => void city.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View className="overflow-hidden rounded-3xl bg-primary-950 p-6">
        <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
        {stateName ? (
          <View className="flex-row items-center gap-1.5">
            <MapPin size={14} color={colors.white} />
            <Text className="text-xs font-bold uppercase tracking-wider text-primary-100">{stateName}</Text>
          </View>
        ) : null}
        <Text className="mt-2 text-2xl font-extrabold text-white">{data.city.name}</Text>
        <Text className="mt-1 text-sm text-primary-100">Şehirdeki Türk topluluğu</Text>
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/15 px-3 py-3">
            <Text className="text-xl font-extrabold text-white">{data.stats?.topicCount ?? topics.length}</Text>
            <Text className="text-xs text-primary-100">Forum konusu</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/15 px-3 py-3">
            <Text className="text-xl font-extrabold text-white">{data.stats?.businessCount ?? businesses.length}</Text>
            <Text className="text-xs text-primary-100">İşletme</Text>
          </View>
        </View>
      </View>

      <View className="mt-6">
        <SectionHeader title="Yaklaşan etkinlikler" onAction={() => router.push("/(tabs)/etkinlikler" as never)} />
        {events.length ? (
          events.map((event) => (
            <Card
              key={event.id}
              className="mb-3"
              onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}` as never)}
            >
              <View className="flex-row items-center gap-3">
                <IconTile icon={CalendarDays} tint={colors.accent} />
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-text" numberOfLines={2}>
                    {event.title}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap gap-3">
                    <MetaItem icon={CalendarDays} label={formatDate(event.startsAt)} />
                    <MetaItem icon={Users} label={`${event._count?.attendees ?? 0} katılımcı`} />
                  </View>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <EmptyState
              icon={CalendarDays}
              title="Yaklaşan etkinlik yok"
              subtitle="Bu şehirde ilk etkinliği sen oluştur."
              actionLabel="Etkinlik oluştur"
              onAction={() => router.push("/(tabs)/etkinlikler/yeni" as never)}
            />
          </Card>
        )}
      </View>

      <View className="mt-6">
        <SectionHeader title="Şehirde konuşulanlar" onAction={() => router.push("/(tabs)/forum" as never)} />
        {topics.length ? (
          topics.map((topic) => (
            <Card
              key={topic.id}
              className="mb-3"
              onPress={() => router.push(`/(tabs)/forum/${topic.id}` as never)}
            >
              {topic.category?.name ? <Badge label={topic.category.name} color="primary" /> : null}
              <Text className="mt-2.5 text-[15px] font-bold text-text" numberOfLines={2}>
                {topic.title}
              </Text>
              <View className="mt-2 flex-row flex-wrap items-center gap-3">
                <MetaItem icon={MessageCircle} label={`${topic._count?.replies ?? 0} yanıt`} />
                <Text className="text-xs text-muted">{formatRelative(topic.createdAt)}</Text>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <EmptyState
              icon={MessagesSquare}
              title="Henüz konu yok"
              subtitle="Bu şehirle ilgili ilk soruyu sen sor."
              actionLabel="Soru sor"
              onAction={() => router.push("/(tabs)/forum/yeni" as never)}
            />
          </Card>
        )}
      </View>

      <View className="mt-6">
        <SectionHeader title="Türkçe hizmet verenler" onAction={() => router.push("/rehber" as never)} />
        {businesses.length ? (
          businesses.map((business) => {
            const rating = Number(business.averageRating) || 0;
            return (
              <Card
                key={business.id}
                className="mb-3"
                onPress={() => router.push(`/rehber/${business.id}` as never)}
              >
                <View className="flex-row items-center gap-3">
                  <IconTile icon={Store} tint={colors.warning} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="flex-1 text-[15px] font-bold text-text" numberOfLines={1}>
                        {business.name}
                      </Text>
                      {business.isVerified ? <BadgeCheck size={16} color={colors.success} /> : null}
                    </View>
                    {business.category?.name ? (
                      <Text className="mt-0.5 text-xs text-muted">{business.category.name}</Text>
                    ) : null}
                    <View className="mt-1.5 flex-row items-center gap-1.5">
                      <StarRating rating={rating} size={12} />
                      <Text className="text-xs text-muted">
                        {rating.toFixed(1)} ({business.reviewCount ?? 0})
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <EmptyState
              icon={Store}
              title="Henüz işletme yok"
              subtitle="Rehbere eklenen işletmeler burada listelenecek."
              actionLabel="İşletme ekle"
              onAction={() => router.push("/rehber/yeni" as never)}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}
