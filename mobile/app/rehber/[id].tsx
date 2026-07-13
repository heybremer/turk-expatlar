import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, Business } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { StarRating } from "@/components/ui/StarRating";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type Review = { id: string; rating: number; comment?: string | null; createdAt: string; user?: { profile?: { displayName: string; avatarUrl?: string | null } | null } | null };
type BusinessDetail = Business & { reviews?: Review[] };

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["business", id],
    queryFn: () => api.get<BusinessDetail>(`/businesses/${id}`, token),
    enabled: !!id,
  });

  if (isLoading) return <LoadingScreen />;
  if (!data) {
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title="İşletme" />
        <ErrorState title="İşletme yüklenemedi" onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title={data.name} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xl font-bold text-text flex-1 mr-2">{data.name}</Text>
            {data.isVerified && (
              <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-1">
                <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                <Text className="text-xs font-medium text-success">Doğrulandı</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-muted mb-1">{data.category.name} · {data.city.name}</Text>
          <View className="flex-row items-center gap-2 mb-3">
            <StarRating rating={data.averageRating} />
            <Text className="text-sm text-muted">{data.averageRating.toFixed(1)} ({data.reviewCount} yorum)</Text>
          </View>
          <Text className="text-sm text-text leading-6">{data.description}</Text>
          {data.speaksTurkish && <Badge label="🇹🇷 Türkçe konuşuyor" color="primary" />}
        </Card>

        {(data.phone || data.whatsapp || data.website || data.address) && (
          <Card>
            <Text className="text-sm font-semibold text-muted mb-3">İLETİŞİM</Text>
            <View className="gap-3">
              {data.address && (
                <View className="flex-row items-start gap-2">
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-text flex-1">{data.address}</Text>
                </View>
              )}
              {data.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.phone}`)} className="flex-row items-center gap-2">
                  <Ionicons name="call-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-primary">{data.phone}</Text>
                </TouchableOpacity>
              )}
              {data.whatsapp && (
                <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${data.whatsapp?.replace(/\D/g, "")}`)} className="flex-row items-center gap-2">
                  <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
                  <Text className="text-sm text-success">WhatsApp</Text>
                </TouchableOpacity>
              )}
              {data.website && (
                <TouchableOpacity onPress={() => Linking.openURL(data.website!)} className="flex-row items-center gap-2">
                  <Ionicons name="globe-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-primary" numberOfLines={1}>{data.website}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}

        {data.reviews && data.reviews.length > 0 && (
          <View>
            <Text className="text-base font-bold text-text mb-3">Yorumlar ({data.reviews.length})</Text>
            {data.reviews.map((r) => (
              <Card key={r.id} className="mb-2">
                <View className="flex-row items-center gap-2 mb-2">
                  <Avatar name={r.user?.profile?.displayName ?? "?"} url={r.user?.profile?.avatarUrl} size="sm" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-text">{r.user?.profile?.displayName ?? "Anonim"}</Text>
                    <Text className="text-xs text-muted">{formatDate(r.createdAt)}</Text>
                  </View>
                  <StarRating rating={r.rating} size={12} />
                </View>
                {r.comment && <Text className="text-sm text-text">{r.comment}</Text>}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
