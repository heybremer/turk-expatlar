import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { api, Business, Event, ForumTopic } from "@/lib/api";

type CityResponse = {
  city: { id: string; name: string; slug: string; state: { name: string; slug: string } };
  events: Event[];
  topics: ForumTopic[];
  businesses: Business[];
  stats: { topicCount: number; businessCount: number };
};

export default function CityScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const city = useQuery({
    queryKey: ["city", slug],
    queryFn: () => api.get<CityResponse>(`/locations/cities/${slug}`),
    enabled: !!slug,
  });

  if (city.isLoading) return <LoadingScreen />;
  if (!city.data) {
    return <ErrorState title="Şehir yüklenemedi" onRetry={() => void city.refetch()} />;
  }

  const data = city.data;
  return (
    <Screen title={data.city.name} subtitle={data.city.state.name}>
      <View className="mb-5 flex-row gap-3">
        <Card className="flex-1 items-center">
          <Text className="text-2xl font-extrabold text-primary">{data.stats.topicCount}</Text>
          <Text className="mt-1 text-xs text-muted">Forum konusu</Text>
        </Card>
        <Card className="flex-1 items-center">
          <Text className="text-2xl font-extrabold text-primary">{data.stats.businessCount}</Text>
          <Text className="mt-1 text-xs text-muted">İşletme</Text>
        </Card>
      </View>

      <Section title="Yaklaşan etkinlikler">
        {data.events.length ? data.events.map((event) => (
          <TouchableOpacity key={event.id} onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}` as never)}>
            <Card className="mb-2">
              <Text className="font-bold text-text">{event.title}</Text>
              <Text className="mt-1 text-sm text-muted">{new Date(event.startsAt).toLocaleDateString("tr-TR")}</Text>
            </Card>
          </TouchableOpacity>
        )) : <EmptyState icon="calendar-outline" title="Yaklaşan etkinlik yok" />}
      </Section>

      <Section title="Şehirde konuşulanlar">
        {data.topics.length ? data.topics.map((topic) => (
          <TouchableOpacity key={topic.id} onPress={() => router.push(`/(tabs)/forum/${topic.id}` as never)}>
            <Card className="mb-2">
              <Badge label={topic.category.name} color="primary" />
              <Text className="mt-2 font-bold text-text">{topic.title}</Text>
              <Text className="mt-1 text-xs text-muted">{topic._count?.replies ?? 0} yanıt</Text>
            </Card>
          </TouchableOpacity>
        )) : <EmptyState icon="chatbubbles-outline" title="Henüz konu yok" />}
      </Section>

      <Section title="Türkçe hizmet verenler">
        {data.businesses.length ? data.businesses.map((business) => (
          <TouchableOpacity key={business.id} onPress={() => router.push(`/rehber/${business.id}` as never)}>
            <Card className="mb-2">
              <Text className="font-bold text-text">{business.name}</Text>
              <Text className="mt-1 text-sm text-muted">{business.category.name}</Text>
              <Text className="mt-2 text-sm font-semibold text-warning">★ {business.averageRating.toFixed(1)}</Text>
            </Card>
          </TouchableOpacity>
        )) : <EmptyState icon="storefront-outline" title="Henüz işletme yok" />}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-lg font-extrabold text-text">{title}</Text>
      {children}
    </View>
  );
}
