import { Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, BlockedUser } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function EngellenenlerScreen() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: () => api.get<BlockedUser[]>("/users/blocked", token),
    enabled: !!token,
  });

  const unblockMut = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}/block`, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["blocked-users"] }),
    onError: () => Alert.alert("Hata", "Engel kaldırılamadı"),
  });

  function confirmUnblock(userId: string, name: string) {
    Alert.alert("Engeli Kaldır", `${name} adlı kullanıcının engelini kaldırmak istiyor musunuz?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Engeli Kaldır", onPress: () => unblockMut.mutate(userId) },
    ]);
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title="Engellenen Kullanıcılar" />

      <FlatList
        data={data ?? []}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
        renderItem={({ item }) => {
          const name = item.profile?.displayName ?? "Kullanıcı";
          return (
            <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <Avatar name={name} url={item.profile?.avatarUrl} size="sm" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-text">{name}</Text>
                <Text className="text-xs text-muted mt-0.5">{formatDate(item.blockedAt)} tarihinde engellendi</Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmUnblock(item.id, name)}
                disabled={unblockMut.isPending}
                className="rounded-xl bg-background px-3 py-2"
              >
                <Text className="text-xs font-semibold text-primary">Engeli Kaldır</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="checkmark-circle-outline" title="Engellenen kullanıcı yok" subtitle="Engellediğiniz kullanıcılar burada görünecek" />
        }
      />
    </View>
  );
}
