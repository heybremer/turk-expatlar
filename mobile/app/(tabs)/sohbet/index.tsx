import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, Text, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  Bell,
  BellOff,
  CheckCheck,
  Globe,
  Hash,
  Lock,
  MapPin,
  MessagesSquare,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ChatAttachment, ChatRoomsPublic, DmListEntry, DmResolveResult, FederalState } from "@/lib/api";
import { normalizeSearch } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchBar } from "@/components/ui/SearchBar";
import { IconTile, ListGroup, ListRow, Segmented } from "@/components/ui/kit";
import { AppHeader, HeaderIconButton } from "@/components/navigation/AppHeader";
import { attachmentSummary } from "@/components/chat/ChatMessageBubble";
import { normalizeTr } from "@/components/chat/search";

type Tab = "odalar" | "dm";

/** listMyDms son mesajın tüm satırını döndürür; paylaşılan tip yalnızca body/createdAt içerir. */
type DmLastMessage = {
  body: string;
  createdAt: string;
  userId?: string;
  attachments?: ChatAttachment[] | null;
  expiresAt?: string | null;
};

type UnreadSummaryItem = { chatId: string; type: string; stateId: string | null; cityId: string | null; unread: number };

type RoomRowData = {
  key: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  route: string;
  unread?: number;
};

type Position = { first: boolean; last: boolean };

const DM_REFETCH_MS = 20000;

function groupCls({ first, last }: Position) {
  return `mx-4 overflow-hidden border-x border-border bg-surface ${first ? "rounded-t-3xl border-t" : ""} ${
    last ? "rounded-b-3xl border-b" : ""
  }`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** WhatsApp tarzı: bugün saat, dün "Dün", son 7 gün gün adı, daha eski tarih. */
function formatChatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  if (isSameDay(d, now)) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Dün";
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString("tr-TR", { weekday: "long" });
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function dmPreview(last: DmLastMessage | null | undefined, myId: string | undefined) {
  if (!last) return "Sohbeti başlatın";
  let text: string;
  if (last.expiresAt) {
    text = new Date(last.expiresAt).getTime() > Date.now() ? "⏱ Süreli mesaj" : "⏱ Süresi dolan mesaj";
  } else {
    text = last.body?.trim() || attachmentSummary(last.attachments) || "Mesaj";
  }
  return last.userId && last.userId === myId ? `Sen: ${text}` : text;
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <View className="h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5">
      <Text className="text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

function RoomRow({ room, pos }: { room: RoomRowData; pos: Position }) {
  const router = useRouter();
  const unread = room.unread ?? 0;
  return (
    <View className={groupCls(pos)}>
      <Pressable
        onPress={() => router.push(room.route as never)}
        accessibilityRole="button"
        accessibilityLabel={`${room.label} sohbet odası${unread > 0 ? `, ${unread} okunmamış mesaj` : ""}`}
        className="flex-row items-center gap-3 px-4 py-3 active:bg-background"
      >
        <IconTile icon={room.icon} size={42} />
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>
            {room.label}
          </Text>
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {room.sublabel}
          </Text>
        </View>
        {unread > 0 ? <UnreadBadge count={unread} /> : null}
      </Pressable>
      {!pos.last ? <View className="ml-[70px] h-px bg-border" /> : null}
    </View>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <Text className="px-5 pb-2 pt-5 text-xs font-bold uppercase tracking-wider text-muted">{label}</Text>
  );
}

function SwipeAction({
  icon: Icon,
  label,
  color,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ backgroundColor: color, width: 76 }}
      className="items-center justify-center gap-1 active:opacity-80"
    >
      <Icon size={20} color={colors.white} />
      <Text className="text-[11px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function DmRow({
  dm,
  pos,
  myId,
  muted,
  onOpenOptions,
  onDelete,
  onMarkRead,
}: {
  dm: DmListEntry;
  pos: Position;
  myId?: string;
  muted: boolean;
  onOpenOptions: (dm: DmListEntry) => void;
  onDelete: (dm: DmListEntry) => void;
  onMarkRead: (dm: DmListEntry) => void;
}) {
  const router = useRouter();
  const swipeRef = useRef<SwipeableMethods>(null);
  if (!dm.partner) return null;
  const partner = dm.partner;
  const name = partner.profile?.displayName ?? "Kullanıcı";
  const unread = dm.unread > 0;
  const last = dm.lastMessage as DmLastMessage | null | undefined;
  const preview = dmPreview(last, myId);

  const closeThen = (fn: () => void) => () => {
    swipeRef.current?.close();
    fn();
  };

  return (
    <View className={groupCls(pos)}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={() => (
          <View className="flex-row">
            {unread ? (
              <SwipeAction icon={CheckCheck} label="Okundu" color={colors.primary} onPress={closeThen(() => onMarkRead(dm))} />
            ) : null}
            <SwipeAction icon={Trash2} label="Sil" color={colors.danger} onPress={closeThen(() => onDelete(dm))} />
          </View>
        )}
      >
        <Pressable
          onPress={() => router.push(`/(tabs)/sohbet/dm-${partner.id}` as never)}
          onLongPress={() => {
            haptics.longPress();
            onOpenOptions(dm);
          }}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={`${name} ile sohbet. ${preview}${unread ? `. ${dm.unread} okunmamış mesaj` : ""}${
            muted ? ". Sessizde" : ""
          }`}
          accessibilityHint="Seçenekler için basılı tutun"
          accessibilityActions={[
            { name: "longpress", label: "Seçenekler" },
            { name: "delete", label: "Sohbeti sil" },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "delete") onDelete(dm);
            else onOpenOptions(dm);
          }}
          className="flex-row items-center gap-3 bg-surface px-4 py-3 active:bg-background"
        >
          <Avatar name={name} url={partner.profile?.avatarUrl} size="md" />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center justify-between gap-2">
              <Text className={`flex-1 text-[15px] text-text ${unread ? "font-bold" : "font-semibold"}`} numberOfLines={1}>
                {name}
              </Text>
              {last ? (
                <Text className={`text-xs ${unread ? "font-semibold text-primary" : "text-muted"}`}>
                  {formatChatTime(last.createdAt)}
                </Text>
              ) : null}
            </View>
            <View className="mt-0.5 flex-row items-center gap-2">
              <Text className={`flex-1 text-[13px] ${unread ? "text-text" : "text-muted"}`} numberOfLines={1}>
                {preview}
              </Text>
              {muted ? <BellOff size={14} color={colors.mutedLight} /> : null}
              {unread ? <UnreadBadge count={dm.unread} /> : null}
            </View>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
      {!pos.last ? <View className="ml-[72px] h-px bg-border" /> : null}
    </View>
  );
}

function OptionRow({
  icon,
  label,
  onPress,
  destructive = false,
  first = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-14 flex-row items-center gap-3 px-4 py-2.5 active:bg-background ${first ? "" : "border-t border-border"}`}
    >
      <IconTile icon={icon} tint={destructive ? colors.danger : colors.primary} size={36} />
      <Text className={`text-[15px] font-semibold ${destructive ? "text-danger" : "text-text"}`}>{label}</Text>
    </Pressable>
  );
}

/** DM satırı uzun basma menüsü; sessize alma durumu açılışta sunucudan okunur. */
function DmOptionsSheet({
  dm,
  token,
  onClose,
  onDelete,
  onMarkRead,
  onMuteChanged,
}: {
  dm: DmListEntry | null;
  token: string | null;
  onClose: () => void;
  onDelete: (dm: DmListEntry) => void;
  onMarkRead: (dm: DmListEntry) => void;
  onMuteChanged: (chatId: string, muted: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const lastDmRef = useRef(dm);
  if (dm) lastDmRef.current = dm;
  const shown = dm ?? lastDmRef.current;

  useEffect(() => {
    setMuted(null);
    if (!dm?.partner || !token) return;
    let cancelled = false;
    api
      .post<DmResolveResult>(`/chat/dm/${dm.partner.id}`, {}, token)
      .then((res) => {
        if (cancelled) return;
        setMuted(!!res.muted);
        onMuteChanged(dm.chatId, !!res.muted);
      })
      .catch(() => {
        if (!cancelled) setMuted(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dm?.chatId, token]);

  async function toggleMute() {
    if (!shown || !token || muted === null || busy) return;
    const next = !muted;
    setBusy(true);
    try {
      await api.patch(`/chat/${shown.chatId}/mute`, { muted: next }, token);
      haptics.success();
      onMuteChanged(shown.chatId, next);
      onClose();
    } catch (err) {
      haptics.error();
      Alert.alert("Hata", err instanceof ApiError ? err.message : "İşlem gerçekleştirilemedi");
    } finally {
      setBusy(false);
    }
  }

  const name = shown?.partner?.profile?.displayName ?? "Kullanıcı";

  return (
    <Modal visible={!!dm} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40" accessibilityLabel="Kapat">
        <Pressable
          onPress={() => {}}
          className="rounded-t-3xl bg-surface px-4 pt-2.5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-border" />
          {shown?.partner ? (
            <View className="mb-3 flex-row items-center gap-3 px-1">
              <Avatar name={name} url={shown.partner.profile?.avatarUrl} size="sm" />
              <Text className="flex-1 text-[17px] font-bold text-text" numberOfLines={1}>
                {name}
              </Text>
            </View>
          ) : null}
          <View className="overflow-hidden rounded-3xl border border-border bg-surface">
            {shown && shown.unread > 0 ? (
              <OptionRow
                first
                icon={CheckCheck}
                label="Okundu olarak işaretle"
                onPress={() => {
                  onMarkRead(shown);
                  onClose();
                }}
              />
            ) : null}
            {muted === null ? (
              <View
                className={`min-h-14 flex-row items-center gap-3 px-4 py-2.5 ${shown && shown.unread > 0 ? "border-t border-border" : ""}`}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-[15px] text-muted">Bildirim durumu yükleniyor…</Text>
              </View>
            ) : (
              <OptionRow
                first={!(shown && shown.unread > 0)}
                icon={muted ? Bell : BellOff}
                label={muted ? "Bildirimleri aç" : "Bildirimleri sessize al"}
                onPress={() => void toggleMute()}
              />
            )}
            <OptionRow
              icon={Trash2}
              label="Sohbeti sil"
              destructive
              onPress={() => {
                onClose();
                if (shown) setTimeout(() => onDelete(shown), 250);
              }}
            />
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="mt-3 min-h-12 items-center justify-center rounded-2xl bg-background active:opacity-70"
          >
            <Text className="text-[15px] font-semibold text-muted">Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ListItem =
  | { kind: "header"; key: string; label: string }
  | { kind: "room"; key: string; room: RoomRowData; pos: Position };

export default function SohbetIndex() {
  const { token, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("odalar");
  const [query, setQuery] = useState("");
  const [dmQuery, setDmQuery] = useState("");
  const [optionsDm, setOptionsDm] = useState<DmListEntry | null>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});

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

  const { data: unreadSummary, refetch: refetchUnreadSummary } = useQuery({
    queryKey: ["chat-unread-summary"],
    queryFn: () => api.get<UnreadSummaryItem[]>("/chat/unread-summary", token),
    enabled: !!token,
    refetchInterval: DM_REFETCH_MS * 3,
  });

  const {
    data: dms,
    isLoading: dmsLoading,
    isError: dmsError,
    refetch: refetchDms,
    isRefetching: dr,
  } = useQuery({
    queryKey: ["chat-dms"],
    queryFn: () => api.get<DmListEntry[]>("/chat/dm/list", token),
    enabled: !!token,
    refetchInterval: DM_REFETCH_MS,
  });

  // Gateway kullanıcıya özel bir "yeni DM" event'i yayınlamıyor (yalnızca odaya katılanlara
  // new_message gider); bu yüzden odaklanınca, periyodik olarak ve DM push'u gelince yenilenir.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void refetchDms();
      void refetchUnreadSummary();
    }, [token, refetchDms, refetchUnreadSummary]),
  );

  useEffect(() => {
    if (!token) return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string } | undefined;
      if (data?.type === "chat_dm") {
        void queryClient.invalidateQueries({ queryKey: ["chat-dms"] });
        void queryClient.invalidateQueries({ queryKey: ["chat-dm-unread"] });
      }
    });
    return () => sub.remove();
  }, [token, queryClient]);

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

  const roomUnread = useMemo(() => {
    const byKey: Record<string, number> = {};
    for (const item of unreadSummary ?? []) {
      if (item.type === "GLOBAL") byKey.global = (byKey.global ?? 0) + item.unread;
      else if (item.type === "STATE" && item.stateId) byKey[`state-${item.stateId}`] = item.unread;
      else if (item.type === "CITY" && item.cityId) byKey[`city-${item.cityId}`] = item.unread;
    }
    return byKey;
  }, [unreadSummary]);

  const items: ListItem[] = useMemo(() => {
    const sections: { key: string; label?: string; rooms: RoomRowData[] }[] = [];
    const q = query.trim();

    if (q) {
      const nq = normalizeSearch(q);
      const found: RoomRowData[] = [];
      for (const s of states ?? []) {
        if (normalizeSearch(s.name).includes(nq)) {
          found.push({
            key: `state-${s.id}`,
            label: s.name,
            sublabel: "Eyalet sohbeti",
            icon: MapPin,
            route: `/(tabs)/sohbet/state-${s.slug}`,
            unread: roomUnread[`state-${s.id}`],
          });
        }
        for (const c of s.cities) {
          if (normalizeSearch(c.name).includes(nq)) {
            found.push({
              key: `city-${c.id}`,
              label: c.name,
              sublabel: `${s.name} · Şehir sohbeti`,
              icon: Hash,
              route: `/(tabs)/sohbet/city-${c.slug}`,
              unread: roomUnread[`city-${c.id}`],
            });
          }
        }
      }
      sections.push({ key: "search", label: found.length ? "Arama Sonuçları" : "Sonuç bulunamadı", rooms: found });
    } else {
      sections.push({
        key: "global",
        rooms: [
          {
            key: "global",
            label: rooms?.global?.name ?? "Genel Sohbet",
            sublabel: "Herkes katılabilir",
            icon: Globe,
            route: "/(tabs)/sohbet/global-global",
            unread: roomUnread.global,
          },
        ],
      });

      const mine: RoomRowData[] = [];
      if (myState) {
        mine.push({
          key: `mystate-${myState.id}`,
          label: myState.name,
          sublabel: "Eyalet sohbeti",
          icon: MapPin,
          route: `/(tabs)/sohbet/state-${myState.slug}`,
          unread: roomUnread[`state-${myState.id}`],
        });
      }
      if (myCity) {
        mine.push({
          key: `mycity-${myCity.id}`,
          label: myCity.name,
          sublabel: "Şehir sohbeti",
          icon: Hash,
          route: `/(tabs)/sohbet/city-${myCity.slug}`,
          unread: roomUnread[`city-${myCity.id}`],
        });
      }
      if (mine.length) sections.push({ key: "bolgem", label: "Bölgem", rooms: mine });

      sections.push({
        key: "eyaletler",
        label: "Eyaletler",
        rooms: (states ?? []).map((s) => ({
          key: `all-state-${s.id}`,
          label: s.name,
          sublabel: "Eyalet sohbeti",
          icon: Hash,
          route: `/(tabs)/sohbet/state-${s.slug}`,
        })),
      });
    }

    const list: ListItem[] = [];
    for (const section of sections) {
      if (section.label) list.push({ kind: "header", key: `h-${section.key}`, label: section.label });
      section.rooms.forEach((room, i) =>
        list.push({
          kind: "room",
          key: room.key,
          room,
          pos: { first: i === 0, last: i === section.rooms.length - 1 },
        }),
      );
    }
    return list;
  }, [query, states, rooms, myState, myCity, roomUnread]);

  const allDms = useMemo(
    () =>
      (dms ?? [])
        .filter((d) => !!d.partner)
        .sort((a, b) => {
          const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return tb - ta;
        }),
    [dms],
  );
  const visibleDms = useMemo(() => {
    const nq = normalizeTr(dmQuery);
    if (!nq) return allDms;
    return allDms.filter(
      (d) =>
        normalizeTr(d.partner?.profile?.displayName ?? "").includes(nq) ||
        normalizeTr(d.lastMessage?.body ?? "").includes(nq),
    );
  }, [allDms, dmQuery]);
  const totalUnreadDms = allDms.reduce((sum, d) => sum + (d.unread ?? 0), 0);

  const loading = tab === "odalar" ? roomsLoading || statesLoading : dmsLoading;
  const refetch =
    tab === "odalar"
      ? () => Promise.all([refetchRooms(), refetchUnreadSummary()])
      : () => Promise.all([refetchDms(), queryClient.invalidateQueries({ queryKey: ["chat-dm-unread"] })]);
  const isRefetching = tab === "odalar" ? rr : dr;

  function updateDmCache(fn: (list: DmListEntry[]) => DmListEntry[]) {
    queryClient.setQueryData<DmListEntry[]>(["chat-dms"], (prev) => (prev ? fn(prev) : prev));
  }

  function handleDeleteDm(dm: DmListEntry) {
    if (!token) return;
    const name = dm.partner?.profile?.displayName ?? "Kullanıcı";
    Alert.alert(
      "Sohbeti sil",
      `${name} ile olan sohbet listenizden kaldırılacak. Yeni mesaj gelirse tekrar görünür.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const snapshot = queryClient.getQueryData<DmListEntry[]>(["chat-dms"]);
            updateDmCache((list) => list.filter((d) => d.chatId !== dm.chatId));
            try {
              await api.delete(`/chat/dm/${dm.chatId}`, token);
              haptics.success();
            } catch {
              queryClient.setQueryData(["chat-dms"], snapshot);
              haptics.error();
              Alert.alert("Hata", "Sohbet silinemedi, lütfen tekrar deneyin.");
            } finally {
              void queryClient.invalidateQueries({ queryKey: ["chat-dms"] });
              void queryClient.invalidateQueries({ queryKey: ["chat-dm-unread"] });
            }
          },
        },
      ],
    );
  }

  async function handleMarkRead(dm: DmListEntry) {
    if (!token || dm.unread === 0) return;
    updateDmCache((list) => list.map((d) => (d.chatId === dm.chatId ? { ...d, unread: 0 } : d)));
    try {
      await api.patch(`/chat/dm/${dm.chatId}/read`, {}, token);
      haptics.tap();
    } catch {
      void queryClient.invalidateQueries({ queryKey: ["chat-dms"] });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["chat-dm-unread"] });
    }
  }

  const handleMuteChanged = useCallback((chatId: string, muted: boolean) => {
    setMutedMap((prev) => (prev[chatId] === muted ? prev : { ...prev, [chatId]: muted }));
  }, []);

  const refreshControl = (
    <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
  );

  const rulesFooter = (
    <ListGroup className="mx-4 mt-6">
      <ListRow
        first
        icon={ShieldCheck}
        title="Sohbet kuralları"
        subtitle="Topluluk standartları ve moderasyon"
        onPress={() => router.push("/(tabs)/sohbet/kurallar" as never)}
      />
    </ListGroup>
  );

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title="Sohbet"
        subtitle="Odalar ve özel mesajlar"
        compact
        action={
          <>
            <HeaderIconButton
              icon={ShieldCheck}
              label="Sohbet kuralları"
              onPress={() => router.push("/(tabs)/sohbet/kurallar" as never)}
            />
            {token && tab === "dm" ? (
              <HeaderIconButton
                icon={Pencil}
                label="Yeni mesaj"
                onPress={() => router.push("/(tabs)/sohbet/yeni" as never)}
              />
            ) : null}
          </>
        }
      >
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "odalar", label: "Odalar" },
            { value: "dm", label: "Mesajlar", badge: totalUnreadDms },
          ]}
        />
        {tab === "odalar" ? (
          <SearchBar value={query} onChangeText={setQuery} placeholder="Eyalet veya şehir ara…" className="mt-3" />
        ) : token && allDms.length > 0 ? (
          <SearchBar value={dmQuery} onChangeText={setDmQuery} placeholder="Kişi veya mesaj ara…" className="mt-3" />
        ) : null}
      </AppHeader>

      {tab === "dm" && !token ? (
        <EmptyState
          icon={Lock}
          title="Giriş yapın"
          subtitle="Özel mesajları görmek için giriş yapmalısınız."
          actionLabel="Giriş yap"
          onAction={() => router.push("/(auth)/giris" as never)}
        />
      ) : loading ? (
        <SkeletonList count={5} />
      ) : tab === "odalar" && statesError ? (
        <ErrorState
          title="Odalar yüklenemedi"
          subtitle={statesErrorObj instanceof ApiError ? statesErrorObj.message : undefined}
          onRetry={() => void refetchStates()}
        />
      ) : tab === "odalar" ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          renderItem={({ item }) =>
            item.kind === "header" ? <GroupLabel label={item.label} /> : <RoomRow room={item.room} pos={item.pos} />
          }
          ListFooterComponent={rulesFooter}
        />
      ) : dmsError && allDms.length === 0 ? (
        <ErrorState title="Mesajlar yüklenemedi" onRetry={() => void refetchDms()} />
      ) : allDms.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Henüz mesajınız yok"
          subtitle="Bir oda içinde birine dokunarak veya yeni mesajla özel sohbet başlatabilirsiniz."
          actionLabel="Yeni mesaj"
          onAction={() => router.push("/(tabs)/sohbet/yeni" as never)}
        />
      ) : (
        <FlatList
          data={visibleDms}
          keyExtractor={(d) => d.chatId}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <EmptyState icon={Search} title="Sonuç bulunamadı" subtitle={`"${dmQuery.trim()}" ile eşleşen sohbet yok`} />
          }
          ListFooterComponent={
            visibleDms.length > 0 ? (
              <Text className="mt-4 px-6 text-center text-[11px] text-muted-light">
                Seçenekler için sola kaydırın veya basılı tutun
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <DmRow
              dm={item}
              pos={{ first: index === 0, last: index === visibleDms.length - 1 }}
              myId={user?.id}
              muted={!!mutedMap[item.chatId]}
              onOpenOptions={setOptionsDm}
              onDelete={handleDeleteDm}
              onMarkRead={(dm) => void handleMarkRead(dm)}
            />
          )}
        />
      )}

      <DmOptionsSheet
        dm={optionsDm}
        token={token}
        onClose={() => setOptionsDm(null)}
        onDelete={handleDeleteDm}
        onMarkRead={(dm) => void handleMarkRead(dm)}
        onMuteChanged={handleMuteChanged}
      />
    </View>
  );
}
