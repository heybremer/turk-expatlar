import { useMemo, useState } from "react";
import { FlatList, Image, Linking, RefreshControl, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Newspaper } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatRelative } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, MetaItem, ToolHero } from "@/components/ui/kit";

type NewsItem = {
  title: string;
  summary?: string | null;
  link: string;
  pubDate?: string | null;
  source?: string | null;
  imageUrl?: string | null;
};

const newsDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : formatRelative(date.toISOString());
};

export default function HaberlerScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isCity = type === "city";
  const profile = useAuth((s) => s.user?.profile);
  const profileState = profile?.state?.name;
  const profileCity = profile?.city?.name;
  const [selected, setSelected] = useState<string>((isCity ? profileCity : profileState) ?? "");

  const placesQuery = useQuery({
    queryKey: ["news-places", isCity ? "city" : "state"],
    queryFn: () => api.get<string[]>(isCity ? "/news/cities" : "/news/states"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const options = useMemo(() => {
    const list = [...(placesQuery.data ?? [])];
    const own = isCity ? profileCity : profileState;
    if (own && !list.includes(own)) list.unshift(own);
    return list.map((p) => ({ value: p, label: p === own ? `${p} (sen)` : p }));
  }, [placesQuery.data, isCity, profileCity, profileState]);

  const place = selected || options[0]?.value || "";

  const newsQuery = useQuery({
    queryKey: ["news", isCity ? "city" : "state", place],
    enabled: !!place,
    staleTime: 5 * 60 * 1000,
    queryFn: () => {
      const params = new URLSearchParams(
        isCity
          ? { cityName: place, ...(place === profileCity && profileState ? { stateName: profileState } : {}) }
          : { stateName: place },
      );
      return api.get<NewsItem[]>(`/news/${isCity ? "city" : "state"}?${params}`);
    },
  });

  const articles = Array.isArray(newsQuery.data) ? newsQuery.data : [];

  const hero = (
    <View>
      <ToolHero
        icon={Newspaper}
        title={place ? `${place} gündemi` : "Yerel haberler"}
        subtitle={isCity ? "Şehrinden son haberler ve gelişmeler." : "Eyaletinden son haberler ve gelişmeler."}
      />
      {options.length > 0 ? (
        <ChipRow className="mb-4" options={options} value={place} onChange={setSelected} />
      ) : null}
    </View>
  );

  return (
    <Screen title={isCity ? "Şehir Haberleri" : "Eyalet Haberleri"} subtitle={place || undefined} scroll={false}>
      <FlatList
        data={newsQuery.isLoading || newsQuery.isError ? [] : articles}
        keyExtractor={(a, i) => `${i}-${a.link}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        ListHeaderComponent={hero}
        refreshControl={
          <RefreshControl
            refreshing={newsQuery.isRefetching}
            onRefresh={() => {
              void newsQuery.refetch();
              if (placesQuery.isError) void placesQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          newsQuery.isLoading || (placesQuery.isLoading && !place) ? (
            <View className="-mx-4">
              <SkeletonList count={4} />
            </View>
          ) : newsQuery.isError ? (
            <ErrorState
              title="Haberler yüklenemedi"
              subtitle={newsQuery.error instanceof Error ? newsQuery.error.message : undefined}
              onRetry={() => void newsQuery.refetch()}
            />
          ) : !place ? (
            <EmptyState
              icon={Newspaper}
              title={isCity ? "Şehir seçin" : "Eyalet seçin"}
              subtitle={placesQuery.isError ? "Liste yüklenemedi. Aşağı çekerek yenileyin." : "Yukarıdan bir konum seçin."}
            />
          ) : (
            <EmptyState icon={Newspaper} title="Haber bulunamadı" subtitle="Daha sonra tekrar kontrol edin." />
          )
        }
        renderItem={({ item }) => (
          <Card className="mb-3" padded={false} onPress={() => void Linking.openURL(item.link)}>
            <View accessibilityRole="link" accessibilityLabel={`${item.title} haberini aç`}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: "100%", height: 160, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View className="p-4">
                <Text className="text-base font-bold leading-6 text-text" numberOfLines={3}>
                  {item.title}
                </Text>
                {item.summary ? (
                  <Text className="mt-1.5 text-sm leading-5 text-muted" numberOfLines={3}>
                    {item.summary}
                  </Text>
                ) : null}
                <View className="mt-3 flex-row items-center gap-3 border-t border-border pt-3">
                  <View className="flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                    {item.source ? <MetaItem icon={Newspaper} label={item.source} /> : null}
                    {item.pubDate ? <MetaItem icon={CalendarDays} label={newsDate(item.pubDate)} /> : null}
                  </View>
                  <ExternalLink size={16} color={colors.primary} />
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
