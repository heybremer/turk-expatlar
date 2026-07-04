import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ChatRoomsPublic, DmListEntry, FederalState } from "@/lib/api";
import { formatRelative, normalizeSearch } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { AppHeader } from "@/components/navigation/AppHeader";

type Tab = "odalar" | "dm";

type RoomRowData = {
  key: string;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

function RoomRow({ room }: { room: RoomRowData }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(room.route as never)}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-border bg-surface"
    >
      <View className="w-11 h-11 bg-primary/10 rounded-full items-center justify-center">
        <Ionicons name={room.icon} size={20} color="#1a56db" />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-text">{room.label}</Text>
        <Text className="text-xs text-muted">{room.sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
    </TouchableOpacity>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="px-4 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted bg-background">
      {label}
    </Text>
  );
}

function DmRow({ dm, onDelete }: { dm: DmListEntry; onDelete: (chatId: string) => void }) {
  const router = useRouter();
  if (!dm.partner) return null;
  const name = dm.partner.profile?.displayName ?? "Kullanıcı";
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/sohbet/dm-${dm.partner!.id}` as never)}
      onLongPress={() => {
        haptics.longPress();
        Alert.alert("Sohbeti sil", `${name} ile olan sohbeti gelen kutunuzdan kaldırmak istiyor musunuz?`, [
          { text: "Vazgeç", style: "cancel" },
          { text: "Sil", style: "destructive", onPress: () => onDelete(dm.chatId) },
        ]);
      }}
      delayLongPress={350}
      className="flex-row items-center gap-3 px-4 py-3 border-b border-border bg-surface"
    >
      <Avatar name={name} url={dm.partner.profile?.avatarUrl} size="md" />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-text">{name}</Text>
          {dm.lastMessage && <Text className="text-xs text-muted">{formatRelative(dm.lastMessage.createdAt)}</Text>}
        </View>
        {dm.lastMessage && (
          <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>{dm.lastMessage.body}</Text>
        )}
      </View>
      {dm.unread > 0 && <Badge label={String(dm.unread)} color="danger" />}
    </TouchableOpacity>
  );
}

type ListItem =
  | { kind: "header"; key: string; label: string }
  | { kind: "room"; key: string; room: RoomRowData };

export default function SohbetIndex() {
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("odalar");
  const [query, setQuery] = useState("");

  const {
    data: rooms,
    isLoading: roomsLoading,
    refetch: refetchRooms,
    isRefetching: rr,
  } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: () => api.get<ChatRoomsPublic>("/chat/rooms"),
    enabled: tab === "odalar",
  });

  const {
    data: states,
    isLoading: statesLoading,
    isError: statesError,
    error: statesErrorObj,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ["chat-states"],
    queryFn: () => api.get<FederalState[]>("/locations/states"),
    enabled: tab === "odalar",
  });

  const { data: dms, isLoading: dmsLoading, refetch: refetchDms, isRefetching: dr } = useQuery({
    queryKey: ["chat-dms"],
    queryFn: () => api.get<DmListEntry[]>("/chat/dm/list", token),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const myStateId = user?.profile?.stateId ?? null;
  const myCityId = user?.profile?.cityId ?? null;

  const myState = useMemo(() => states?.find((s) => s.id === myStateId) ?? null, [states, myStateId]);
  const myCity = useMemo(() => {
    for (const s of states ?? []) {
      const c = s.cities.find((c) => c.id === myCityId);
      if (c) return c;
    }
    return null;
  }, [states, myCityId]);

  const items: ListItem[] = useMemo(() => {
    const list: ListItem[] = [];
    const q = query.trim();

    if (q) {
      const nq = normalizeSearch(q);
      list.push({ kind: "header", key: "h-search", label: "Arama Sonuçları" });
      for (const s of states ?? []) {
        if (normalizeSearch(s.name).includes(nq)) {
          list.push({
            kind: "room",
            key: `state-${s.id}`,
            room: { key: s.id, label: s.name, sublabel: "Eyalet sohbeti", icon: "location-outline", route: `/(tabs)/sohbet/state-${s.slug}` },
          });
        }
        for (const c of s.cities) {
          if (normalizeSearch(c.name).includes(nq)) {
            list.push({
              kind: "room",
              key: `city-${c.id}`,
              room: { key: c.id, label: c.name, sublabel: `${s.name} · Şehir sohbeti`, icon: "business-outline", route: `/(tabs)/sohbet/city-${c.slug}` },
            });
          }
        }
      }
      if (list.length === 1) list.push({ kind: "header", key: "h-empty", label: "Sonuç bulunamadı" });
      return list;
    }

    list.push({
      kind: "room",
      key: "global",
      room: { key: "global", label: rooms?.global?.name ?? "Genel Sohbet", sublabel: "Herkes katılabilir", icon: "globe-outline", route: "/(tabs)/sohbet/global-global" },
    });

    if (myState || myCity) {
      list.push({ kind: "header", key: "h-bolgem", label: "Bölgem" });
      if (myState) {
        list.push({
          kind: "room",
          key: `mystate-${myState.id}`,
          room: { key: myState.id, label: myState.name, sublabel: "Eyalet sohbeti", icon: "location-outline", route: `/(tabs)/sohbet/state-${myState.slug}` },
        });
      }
      if (myCity) {
        list.push({
          kind: "room",
          key: `mycity-${myCity.id}`,
          room: { key: myCity.id, label: myCity.name, sublabel: "Şehir sohbeti", icon: "business-outline", route: `/(tabs)/sohbet/city-${myCity.slug}` },
        });
      }
    }

    list.push({ kind: "header", key: "h-eyaletler", label: "Eyaletler" });
    for (const s of states ?? []) {
      list.push({
        kind: "room",
        key: `all-state-${s.id}`,
        room: { key: s.id, label: s.name, sublabel: "Eyalet sohbeti", icon: "location-outline", route: `/(tabs)/sohbet/state-${s.slug}` },
      });
    }

    return list;
  }, [query, states, rooms, myState, myCity]);

  const loading = tab === "odalar" ? roomsLoading || statesLoading : dmsLoading;
  const refetch = tab === "odalar" ? refetchRooms : refetchDms;
  const isRefetching = tab === "odalar" ? rr : dr;
  const visibleDms = (dms ?? []).filter((d) => !!d.partner);
  const totalUnreadDms = visibleDms.reduce((sum, d) => sum + (d.unread ?? 0), 0);

  async function handleDeleteDm(chatId: string) {
    if (!token) return;
    try {
      await api.delete(`/chat/dm/${chatId}`, token);
      await queryClient.invalidateQueries({ queryKey: ["chat-dms"] });
    } catch {
      Alert.alert("Hata", "Sohbet silinemedi, lütfen tekrar deneyin.");
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-surface">
        <AppHeader
          title="Sohbet"
          subtitle="Odalar ve özel mesajlar"
          compact
          action={
            token && tab === "dm" ? (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/sohbet/yeni" as never)}
                className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center"
              >
                <Ionicons name="create-outline" size={18} color="#1a56db" />
              </TouchableOpacity>
            ) : undefined
          }
        />
        <View className="px-4">
          <View className="flex-row border-b border-border">
            {(["odalar", "dm"] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 border-b-2 ${tab === t ? "border-primary" : "border-transparent"}`}
              >
                <Text className={`text-sm font-semibold ${tab === t ? "text-primary" : "text-muted"}`}>
                  {t === "odalar" ? "Odalar" : "Mesajlarım"}
                </Text>
                {t === "dm" && totalUnreadDms > 0 && <Badge label={String(totalUnreadDms)} color="danger" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {tab === "odalar" && (
          <View className="px-4 py-2.5">
            <SearchBar value={query} onChangeText={setQuery} placeholder="Eyalet veya şehir ara…" />
          </View>
        )}
      </View>

      {loading ? (
        <LoadingScreen />
      ) : tab === "odalar" && statesError ? (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Ionicons name="cloud-offline-outline" size={36} color="#9ca3af" />
          <Text className="text-sm text-muted text-center">
            {statesErrorObj instanceof ApiError ? statesErrorObj.message : "Odalar yüklenemedi"}
          </Text>
          <TouchableOpacity onPress={() => void refetchStates()} className="bg-primary rounded-xl px-5 py-2.5">
            <Text className="text-white font-semibold text-sm">Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : tab === "odalar" ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => (item.kind === "header" ? <SectionLabel label={item.label} /> : <RoomRow room={item.room} />)}
        />
      ) : !token ? (
        <EmptyState icon="lock-closed-outline" title="Giriş yapın" subtitle="Özel mesajları görmek için giriş yapmalısınız." />
      ) : visibleDms.length === 0 ? (
        <EmptyState icon="chatbox-ellipses-outline" title="Henüz mesajınız yok" subtitle="Bir oda içinde birine dokunarak özel mesaj başlatabilirsiniz." />
      ) : (
        <FlatList
          data={visibleDms}
          keyExtractor={(d) => d.chatId}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => <DmRow dm={item} onDelete={handleDeleteDm} />}
        />
      )}
    </View>
  );
}
