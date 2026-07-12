import { Alert, ScrollView, Text, View, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, Event } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type EventDetail = Event & {
  isAttending?: boolean;
  attendees?: { user: { id: string; profile?: { displayName: string; avatarUrl?: string | null } | null } }[];
};

export default function EtkinlikDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get<EventDetail>(`/events/${id}`, token),
    enabled: !!token && !!id,
  });

  const attendMut = useMutation({
    mutationFn: () => api.post(`/events/${id}/attend`, {}, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["event", id] }),
    onError: () => Alert.alert("Hata", "İşlem başarısız oldu"),
  });

  if (isLoading) return <LoadingScreen />;
  if (!data) {
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title="Etkinlik" />
        <ErrorState title="Etkinlik yüklenemedi" onRetry={() => void refetch()} />
      </View>
    );
  }

  const isPaid = data.priceType !== "FREE";
  const organizerName = data.organizer?.profile?.displayName ?? "Düzenleyici";

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title={data.title} />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
      >
        <View className="bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row flex-wrap gap-2 mb-3">
            {data.category && <Badge label={data.category} color="primary" />}
            <Badge label={isPaid ? `€${data.priceAmount ?? "?"}` : "Ücretsiz"} color={isPaid ? "warning" : "success"} />
            {data.status === "CANCELLED" && <Badge label="İptal Edildi" color="danger" />}
          </View>

          <Text className="text-xl font-bold text-text mb-4">{data.title}</Text>

          <View className="gap-2 mb-4">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="calendar-outline" size={16} color="#1a56db" />
              </View>
              <View>
                <Text className="text-sm font-medium text-text">{formatDateTime(data.startsAt)}</Text>
                {data.endsAt && <Text className="text-xs text-muted">→ {formatDateTime(data.endsAt)}</Text>}
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="location-outline" size={16} color="#1a56db" />
              </View>
              <Text className="text-sm text-text flex-1">{data.location} · {data.city.name}, {data.state.name}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="people-outline" size={16} color="#1a56db" />
              </View>
              <Text className="text-sm text-text">
                {data._count?.attendees ?? 0} katılımcı
                {data.capacity ? ` / ${data.capacity} kapasite` : ""}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-text leading-6">{data.description}</Text>
        </View>

        {/* Düzenleyici */}
        {data.organizer && (
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-sm font-semibold text-muted mb-2">DÜZENLEYİCİ</Text>
            <View className="flex-row items-center gap-3">
              <Avatar name={organizerName} url={data.organizer.profile?.avatarUrl} size="md" />
              <Text className="font-semibold text-text">{organizerName}</Text>
            </View>
          </View>
        )}

        {/* Katılımcılar */}
        {data.attendees && data.attendees.length > 0 && (
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-sm font-semibold text-muted mb-3">KATILIMCILAR ({data.attendees.length})</Text>
            <View className="flex-row flex-wrap gap-2">
              {data.attendees.slice(0, 10).map((a) => (
                <Avatar key={a.user.id} name={a.user.profile?.displayName ?? "?"} url={a.user.profile?.avatarUrl} size="sm" />
              ))}
              {data.attendees.length > 10 && (
                <View className="h-9 px-3 bg-background rounded-full items-center justify-center">
                  <Text className="text-xs text-muted">+{data.attendees.length - 10}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Katıl butonu */}
        {token && user?.id !== data.organizer?.id && data.status !== "CANCELLED" && (
          <Button
            label={data.isAttending ? "Katılımı İptal Et" : "Katıl"}
            variant={data.isAttending ? "secondary" : "primary"}
            size="lg"
            loading={attendMut.isPending}
            onPress={() => attendMut.mutate()}
          />
        )}
      </ScrollView>
    </View>
  );
}
