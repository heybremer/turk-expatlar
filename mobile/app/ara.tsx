import { useDeferredValue, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, Business, Event, ForumTopic } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { SearchBar } from "@/components/ui/SearchBar";

type SearchResults = {
  topics: ForumTopic[];
  events: Event[];
  businesses: Business[];
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const result = useQuery({
    queryKey: ["global-search", deferred],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(deferred)}`),
    enabled: deferred.length >= 2,
  });

  const total = result.data
    ? result.data.topics.length + result.data.events.length + result.data.businesses.length
    : 0;

  return (
    <Screen title="Arama" subtitle="Forum, etkinlik ve işletmeler">
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="En az 2 karakter yazın…"
        autoFocus
      />

      {deferred.length < 2 ? (
        <EmptyState
          icon="search-outline"
          title="Ne arıyorsunuz?"
          subtitle="Forum konuları, etkinlikler ve işletmeler arasında arayın."
        />
      ) : result.isLoading ? (
        <LoadingScreen />
      ) : result.isError ? (
        <ErrorState title="Arama yapılamadı" onRetry={() => void result.refetch()} />
      ) : total === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          title="Sonuç bulunamadı"
          subtitle="Başka bir kelime deneyin veya forumda yeni bir soru sorun."
        />
      ) : (
        <View className="mt-5 gap-6">
          {result.data!.topics.length > 0 && (
            <ResultSection title="Forum" count={result.data!.topics.length}>
              {result.data!.topics.map((topic) => (
                <ResultRow
                  key={topic.id}
                  icon="chatbubbles-outline"
                  title={topic.title}
                  subtitle={`${topic.category.name} · ${topic._count?.replies ?? 0} cevap`}
                  onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}
                />
              ))}
            </ResultSection>
          )}
          {result.data!.events.length > 0 && (
            <ResultSection title="Etkinlikler" count={result.data!.events.length}>
              {result.data!.events.map((event) => (
                <ResultRow
                  key={event.id}
                  icon="calendar-outline"
                  title={event.title}
                  subtitle={`${event.city.name} · ${new Date(event.startsAt).toLocaleDateString("tr-TR")}`}
                  onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}`)}
                />
              ))}
            </ResultSection>
          )}
          {result.data!.businesses.length > 0 && (
            <ResultSection title="İşletmeler" count={result.data!.businesses.length}>
              {result.data!.businesses.map((business) => (
                <ResultRow
                  key={business.id}
                  icon="storefront-outline"
                  title={business.name}
                  subtitle={`${business.category.name} · ${business.city.name}`}
                  onPress={() => router.push(`/rehber/${business.id}`)}
                />
              ))}
            </ResultSection>
          )}
        </View>
      )}
    </Screen>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-3 text-base font-bold text-text">
        {title} <Text className="text-muted">({count})</Text>
      </Text>
      <Card className="overflow-hidden p-0">{children}</Card>
    </View>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-b border-border px-4 py-3"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Ionicons name={icon} size={19} color="#0f766e" />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-text" numberOfLines={1}>{title}</Text>
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#9ca3af" />
    </TouchableOpacity>
  );
}
