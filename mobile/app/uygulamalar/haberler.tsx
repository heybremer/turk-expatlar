import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type NewsArticle = {
  title: string;
  description?: string | null;
  url: string;
  publishedAt?: string | null;
  source?: string | null;
};

type NewsResponse = { articles: NewsArticle[] };

export default function HaberlerScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const { user, token } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const stateName = user?.profile?.state?.name;
  const cityName = user?.profile?.city?.name;

  useEffect(() => {
    const isCity = type === "city";
    const name = isCity ? cityName : stateName;

    if (!name || !token) {
      setError(isCity ? "Şehir bilginiz bulunamadı" : "Eyalet bilginiz bulunamadı");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(isCity
      ? { cityName: name, ...(stateName ? { stateName } : {}) }
      : { stateName: name }
    );

    api.get<NewsResponse>(`/news/${isCity ? "city" : "state"}?${params}`, token)
      .then((res) => setArticles(res.articles ?? []))
      .catch(() => setError("Haberler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [type, token]);

  const isCity = type === "city";
  const title = isCity ? `${cityName ?? ""} Haberleri` : `${stateName ?? ""} Haberleri`;

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title={title} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      ) : error ? (
        <EmptyState icon="newspaper-outline" title={error} subtitle="Profil bilgilerinizi tamamlayın" />
      ) : articles.length === 0 ? (
        <EmptyState icon="newspaper-outline" title="Haber bulunamadı" />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(a, i) => `${i}-${a.url}`}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Card className="mb-3">
              <Text className="font-semibold text-text mb-1" numberOfLines={2}>{item.title}</Text>
              {item.description && (
                <Text className="text-sm text-muted mb-2" numberOfLines={3}>{item.description}</Text>
              )}
              <View className="flex-row items-center justify-between mt-1">
                {item.source && <Text className="text-xs text-muted">{item.source}</Text>}
                {item.publishedAt && <Text className="text-xs text-muted">{item.publishedAt.slice(0, 10)}</Text>}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
