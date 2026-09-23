import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Person = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  friendsSince?: string;
};
type FriendRequest = { id: string; createdAt: string; user: Person };
type Tab = "friends" | "requests";

export default function FriendsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuth((state) => state.token);
  const [tab, setTab] = useState<Tab>("friends");

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<Person[]>("/users/friends", token),
  });
  const incoming = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () =>
      api.get<FriendRequest[]>("/users/friend-requests/incoming", token),
  });
  const action = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept
        ? api.post(`/users/friend-requests/${id}/accept`, {}, token)
        : api.delete(`/users/friend-requests/${id}`, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["friends"] });
      void qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  const query = tab === "friends" ? friends : incoming;
  const list = tab === "friends" ? friends.data ?? [] : incoming.data ?? [];

  return (
    <Screen title="Arkadaşlar" subtitle="Bağlantıların ve gelen istekler">
      <View className="mb-5 flex-row rounded-xl border border-border bg-surface p-1">
        <TabButton
          label={`Arkadaşlar (${friends.data?.length ?? 0})`}
          active={tab === "friends"}
          onPress={() => setTab("friends")}
        />
        <TabButton
          label={`İstekler (${incoming.data?.length ?? 0})`}
          active={tab === "requests"}
          onPress={() => setTab("requests")}
        />
      </View>

      {query.isLoading ? (
        <LoadingScreen />
      ) : query.isError ? (
        <ErrorState
          title="Liste yüklenemedi"
          onRetry={() => void query.refetch()}
        />
      ) : !list.length ? (
        <EmptyState
          icon="people-outline"
          title={tab === "friends" ? "Henüz arkadaşın yok" : "Bekleyen istek yok"}
          subtitle={
            tab === "friends"
              ? "Sohbet ve forumdaki kullanıcıların profillerinden istek gönderebilirsin."
              : undefined
          }
        />
      ) : (
        <View className="gap-3">
          {list.map((entry) => {
            const person = "user" in entry ? entry.user : entry;
            return (
              <TouchableOpacity
                key={"user" in entry ? entry.id : person.id}
                onPress={() => router.push(`/kullanici/${person.id}` as never)}
                className="flex-row items-center rounded-2xl border border-border bg-surface p-4"
              >
                <Avatar
                  name={person.displayName}
                  url={person.avatarUrl}
                  size="md"
                />
                <View className="ml-3 flex-1">
                  <Text className="font-bold text-text">{person.displayName}</Text>
                  <Text className="mt-0.5 text-xs text-muted">
                    {"user" in entry ? "Sana arkadaşlık isteği gönderdi" : "Arkadaşın"}
                  </Text>
                </View>
                {"user" in entry ? (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => action.mutate({ id: entry.id, accept: false })}
                      className="min-h-10 justify-center rounded-xl border border-border px-3"
                    >
                      <Text className="font-semibold text-muted">Reddet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => action.mutate({ id: entry.id, accept: true })}
                      className="min-h-10 justify-center rounded-xl bg-primary px-3"
                    >
                      <Text className="font-semibold text-white">Kabul</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`min-h-11 flex-1 items-center justify-center rounded-lg ${
        active ? "bg-primary" : ""
      }`}
    >
      <Text className={active ? "font-semibold text-white" : "font-medium text-muted"}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
