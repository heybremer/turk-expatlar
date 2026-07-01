import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, Notification } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type NotifResponse = { items: Notification[]; unreadCount: number };

export default function BildirimlerScreen() {
  const { token } = useAuth();
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
            <View className={`mb-2 rounded-2xl border p-4 ${item.read ? "bg-surface border-border" : "bg-primary/5 border-primary/20"}`}>
              {!item.read && (
                <View className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
              )}
              <Text className="font-semibold text-text mb-1">{item.title}</Text>
              <Text className="text-sm text-muted">{item.body}</Text>
              <Text className="text-xs text-muted mt-2">{formatRelative(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="notifications-outline" title="Bildirim yok" subtitle="Yeni bildirimler burada görünecek" />}
        />
      )}
    </View>
  );
}
