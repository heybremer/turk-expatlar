import { ReactNode, useState } from "react";
import { Alert, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, MessageCircle, Search, UserMinus, UserPlus, Users, X } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { DetailHeader, Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/kit";
import { HeaderIconButton } from "@/components/navigation/AppHeader";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";
import { formatRelative } from "@/lib/utils";

type Person = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  friendsSince?: string;
};
type FriendRequest = { id: string; createdAt: string; user: Person };
type Tab = "friends" | "requests" | "sent";
type Action =
  | { kind: "accept" | "reject" | "cancel"; requestId: string; userId: string }
  | { kind: "remove"; userId: string };

export default function FriendsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuth((state) => state.token);
  const [tab, setTab] = useState<Tab>("friends");

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<Person[]>("/users/friends", token),
    enabled: !!token,
  });
  const incoming = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => api.get<FriendRequest[]>("/users/friend-requests/incoming", token),
    enabled: !!token,
  });
  const outgoing = useQuery({
    queryKey: ["friend-requests-outgoing"],
    queryFn: () => api.get<FriendRequest[]>("/users/friend-requests/outgoing", token),
    enabled: !!token,
  });

  const action = useMutation({
    mutationFn: (a: Action) => {
      switch (a.kind) {
        case "accept":
          return api.post(`/users/friend-requests/${a.requestId}/accept`, {}, token);
        case "reject":
        case "cancel":
          return api.delete(`/users/friend-requests/${a.requestId}`, token);
        case "remove":
          return api.delete(`/users/${a.userId}/friend`, token);
      }
    },
    onMutate: async (a) => {
      const drop = (key: string[], match: (r: FriendRequest) => boolean) =>
        qc.setQueryData<FriendRequest[]>(key, (prev) => prev?.filter((r) => !match(r)));
      if (a.kind === "remove") {
        await qc.cancelQueries({ queryKey: ["friends"] });
        qc.setQueryData<Person[]>(["friends"], (prev) => prev?.filter((p) => p.id !== a.userId));
      } else if (a.kind === "cancel") {
        await qc.cancelQueries({ queryKey: ["friend-requests-outgoing"] });
        drop(["friend-requests-outgoing"], (r) => r.id === a.requestId);
      } else {
        await qc.cancelQueries({ queryKey: ["friend-requests"] });
        drop(["friend-requests"], (r) => r.id === a.requestId);
      }
    },
    onError: (e) =>
      Alert.alert("İşlem başarısız", e instanceof ApiError ? e.message : "Lütfen tekrar deneyin."),
    onSettled: (_d, _e, a) => {
      void qc.invalidateQueries({ queryKey: ["friends"] });
      void qc.invalidateQueries({ queryKey: ["friend-requests"] });
      void qc.invalidateQueries({ queryKey: ["friend-requests-outgoing"] });
      void qc.invalidateQueries({ queryKey: ["friendship", a.userId] });
    },
  });

  const confirmRemove = (person: Person) =>
    Alert.alert("Arkadaşlıktan çıkar", `${person.displayName} arkadaş listenden çıkarılsın mı?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkar", style: "destructive", onPress: () => action.mutate({ kind: "remove", userId: person.id }) },
    ]);

  const query = tab === "friends" ? friends : tab === "requests" ? incoming : outgoing;
  const isPending = (id: string) =>
    action.isPending &&
    (("requestId" in action.variables! && action.variables.requestId === id) ||
      (action.variables!.kind === "remove" && action.variables!.userId === id));

  const refreshing =
    (friends.isRefetching || incoming.isRefetching || outgoing.isRefetching) && !query.isLoading;
  const onRefresh = () => {
    void friends.refetch();
    void incoming.refetch();
    void outgoing.refetch();
  };

  const emptyCopy = {
    friends: {
      icon: Users,
      title: "Henüz arkadaşın yok",
      subtitle: "Sohbet ve forumdaki kullanıcıların profillerinden istek gönderebilirsin.",
    },
    requests: { icon: UserPlus, title: "Bekleyen istek yok", subtitle: "Yeni arkadaşlık istekleri burada görünecek." },
    sent: { icon: Clock, title: "Gönderilen istek yok", subtitle: "Yanıt bekleyen isteklerin burada listelenir." },
  }[tab];

  const renderPerson = (person: Person, subtitle: string, key: string, actions: ReactNode) => (
    <Card key={key}>
      <Pressable
        onPress={() => router.push(`/kullanici/${person.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`${person.displayName} profilini aç`}
        className="min-h-11 flex-row items-center gap-3 active:opacity-70"
      >
        <Avatar name={person.displayName} url={person.avatarUrl} size="md" />
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-text" numberOfLines={1}>
            {person.displayName}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text>
        </View>
      </Pressable>
      {actions}
    </Card>
  );

  return (
    <Screen
      header={
        <DetailHeader
          title="Arkadaşlar"
          subtitle="Bağlantıların ve istekler"
          action={<HeaderIconButton icon={Search} label="Kişi ara" onPress={() => router.push("/ara" as never)} />}
        >
          <Segmented
            options={[
              { value: "friends", label: `Arkadaşlar${friends.data ? ` (${friends.data.length})` : ""}` },
              { value: "requests", label: "Gelen", badge: incoming.data?.length ?? 0 },
              { value: "sent", label: "Gönderilen" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </DetailHeader>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {query.isLoading ? (
        <View className="-m-4">
          <SkeletonList count={5} />
        </View>
      ) : query.isError ? (
        <ErrorState title="Liste yüklenemedi" onRetry={() => void query.refetch()} />
      ) : tab === "friends" ? (
        !friends.data?.length ? (
          <EmptyState {...emptyCopy} actionLabel="Kişi ara" onAction={() => router.push("/ara" as never)} />
        ) : (
          <View className="gap-3">
            {friends.data.map((person) =>
              renderPerson(
                person,
                person.friendsSince ? `${formatRelative(person.friendsSince)} arkadaş oldunuz` : "Arkadaşın",
                person.id,
                <View className="mt-3 flex-row gap-2">
                  <Button
                    label="Mesaj"
                    size="sm"
                    variant="soft"
                    icon={MessageCircle}
                    className="flex-1"
                    onPress={() => router.push(`/(tabs)/sohbet/dm-${person.id}` as never)}
                  />
                  <Button
                    label="Çıkar"
                    size="sm"
                    variant="secondary"
                    icon={UserMinus}
                    className="flex-1"
                    loading={isPending(person.id)}
                    disabled={action.isPending}
                    onPress={() => confirmRemove(person)}
                    accessibilityLabel={`${person.displayName} arkadaşlıktan çıkar`}
                  />
                </View>,
              ),
            )}
          </View>
        )
      ) : !(query.data as FriendRequest[] | undefined)?.length ? (
        <EmptyState {...emptyCopy} />
      ) : (
        <View className="gap-3">
          {(query.data as FriendRequest[]).map((req) =>
            renderPerson(
              req.user,
              tab === "requests"
                ? `Sana arkadaşlık isteği gönderdi · ${formatRelative(req.createdAt)}`
                : `İstek gönderildi · ${formatRelative(req.createdAt)}`,
              req.id,
              tab === "requests" ? (
                <View className="mt-3 flex-row gap-2">
                  <Button
                    label="Reddet"
                    variant="secondary"
                    size="sm"
                    icon={X}
                    className="flex-1"
                    disabled={action.isPending}
                    onPress={() => action.mutate({ kind: "reject", requestId: req.id, userId: req.user.id })}
                    accessibilityLabel={`${req.user.displayName} isteğini reddet`}
                  />
                  <Button
                    label="Kabul et"
                    size="sm"
                    icon={Check}
                    className="flex-1"
                    loading={isPending(req.id)}
                    disabled={action.isPending}
                    onPress={() => action.mutate({ kind: "accept", requestId: req.id, userId: req.user.id })}
                    accessibilityLabel={`${req.user.displayName} isteğini kabul et`}
                  />
                </View>
              ) : (
                <Button
                  label="İsteği geri çek"
                  variant="secondary"
                  size="sm"
                  icon={X}
                  className="mt-3"
                  loading={isPending(req.id)}
                  disabled={action.isPending}
                  onPress={() => action.mutate({ kind: "cancel", requestId: req.id, userId: req.user.id })}
                />
              ),
            ),
          )}
        </View>
      )}
    </Screen>
  );
}
