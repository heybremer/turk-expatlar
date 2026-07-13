import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, Notification } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type NotifResponse = { items: Notification[]; unreadCount: number };

/** Web bağlantısını mobil uygulama rotasına çevirir (eşleşme yoksa null). */
function resolveNotificationRoute(link?: string | null): string | null {
  if (!link) return null;
  const path = link.replace(/^https?:\/\/[^/]+/, "");
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const [section, id] = segments;
  switch (section) {
    case "forum":
      return `/(tabs)/forum/${id}`;
    case "etkinlikler":
      return `/(tabs)/etkinlikler/${id}`;
    case "isler":
      return `/isler/${id}`;
    case "rehber":
      return `/rehber/${id}`;
    default:
      return null;
  }
}

export default function BildirimlerScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotifResponse>("/notifications", token),
    enabled: !!token,
  });

  const markAllMut = useMutation({
    mutationFn: () => api.patch("/notifications/read-all", {}, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function handlePress(item: Notification) {
    if (!item.read) {
      api
        .patch(`/notifications/${item.id}/read`, {}, token)
        .then(() => void qc.invalidateQueries({ queryKey: ["notifications"] }))
        .catch(() => {});
    }
    const route = resolveNotificationRoute(item.link);
    if (route) router.push(route as never);
  }

  return (
    <View className="flex-1 bg-background">
      <DetailHeader
        title="Bildirimler"
        action={
          (data?.unreadCount ?? 0) > 0 ? (
            <TouchableOpacity onPress={() => markAllMut.mutate()} className="px-3 py-1.5 rounded-xl bg-primary/10">
              <Text className="text-primary text-xs font-semibold">Tümünü Okundu İşaretle</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handlePress(item)}
              className={`mb-2 rounded-2xl border p-4 ${item.read ? "bg-surface border-border" : "bg-primary/5 border-primary/20"}`}
            >
              {!item.read && (
                <View className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
              )}
              <Text className="font-semibold text-text mb-1" numberOfLines={2}>{item.title}</Text>
              <Text className="text-sm text-muted" numberOfLines={3}>{item.body}</Text>
              <Text className="text-xs text-muted mt-2">{formatRelative(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState icon="notifications-outline" title="Bildirim yok" subtitle="Yeni bildirimler burada görünecek" />}
        />
      )}
    </View>
  );
}
