import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Notification } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatRelative } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconTile } from "@/components/ui/kit";
import { Screen } from "@/components/ui/Screen";
import { HeaderIconButton } from "@/components/navigation/AppHeader";

type NotifResponse = { items: Notification[]; unreadCount: number };

const QUERY_KEY = ["notifications"] as const;
const SITE_HOST = /^https?:\/\/(www\.)?turkexpatlar\.de/i;

/** Web bağlantısını mobil uygulama rotasına çevirir (eşleşme yoksa null). */
function resolveNotificationRoute(link?: string | null): string | null {
  if (!link) return null;
  const path = link.replace(SITE_HOST, "").split(/[?#]/)[0];
  if (/^https?:\/\//i.test(path)) return null;
  const segments = path.split("/").filter(Boolean);
  const [section, id] = segments;
  switch (section) {
    case undefined:
    case "akis":
      return "/(tabs)/akis";
    case "forum":
      return id ? `/(tabs)/forum/${id}` : "/(tabs)/forum";
    case "etkinlikler":
      return id ? `/(tabs)/etkinlikler/${id}` : "/(tabs)/etkinlikler";
    case "isler":
      return id ? `/isler/${id}` : "/isler";
    case "rehber":
      return id ? `/rehber/${id}` : "/rehber";
    case "kullanici":
      return id ? `/kullanici/${id}` : null;
    case "sehir":
      return id ? `/sehir/${id}` : null;
    case "seyahat":
      if (id === "yolculuk" && segments[2]) return `/seyahat/yolculuk/${segments[2]}`;
      return id ? `/seyahat/${id}` : "/seyahat";
    case "sohbet":
      return id === "dm" && segments[2] ? `/(tabs)/sohbet/dm-${segments[2]}` : "/(tabs)/sohbet";
    case "uygulamalar":
      return id ? `/uygulamalar/${id}` : "/uygulamalar";
    case "profil":
      if (id === "duzenle") return "/(tabs)/profil/duzenle";
      if (id === "hesap") return "/hesap";
      if (id === "2fa") return "/iki-asamali-dogrulama";
      return "/(tabs)/profil";
    case "arkadaslar":
      return "/arkadaslar";
    case "uyelik":
      return "/uyelik";
    case "destek":
      return "/destek";
    default:
      return null;
  }
}

export default function BildirimlerScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<NotifResponse>("/notifications", token),
    enabled: !!token,
  });

  const markLocal = (id: string | null) => {
    qc.setQueryData<NotifResponse>(QUERY_KEY, (prev) => {
      if (!prev) return prev;
      const items = prev.items.map((n) => (id === null || n.id === id ? { ...n, read: true } : n));
      return { items, unreadCount: items.filter((n) => !n.read).length };
    });
  };

  const syncCaches = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEY });
    void qc.invalidateQueries({ queryKey: ["notif-unread"] });
  };

  const markAllMut = useMutation({
    mutationFn: () => api.patch("/notifications/read-all", {}, token),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<NotifResponse>(QUERY_KEY);
      markLocal(null);
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous);
      Alert.alert("İşlem başarısız", e instanceof ApiError ? e.message : "Bildirimler güncellenemedi.");
    },
    onSettled: syncCaches,
  });

  const markOneMut = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}, token),
    onMutate: (id) => markLocal(id),
    onSettled: syncCaches,
  });

  function handlePress(item: Notification) {
    if (!item.read) markOneMut.mutate(item.id);
    const route = resolveNotificationRoute(item.link);
    if (route) {
      router.push(route as never);
    } else if (item.link && /^https?:\/\//i.test(item.link)) {
      void Linking.openURL(item.link).catch(() => {});
    }
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? items.filter((n) => !n.read).length;

  return (
    <Screen
      title="Bildirimler"
      subtitle={isLoading ? undefined : unread > 0 ? `${unread} okunmamış bildirim` : "Hepsi okundu"}
      scroll={false}
      action={
        unread > 0 ? (
          <HeaderIconButton
            icon={CheckCheck}
            label="Tümünü okundu işaretle"
            onPress={() => {
              if (!markAllMut.isPending) markAllMut.mutate();
            }}
          />
        ) : undefined
      }
    >
      {isLoading ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <ErrorState title="Bildirimler yüklenemedi" onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => {
                void refetch();
                void qc.invalidateQueries({ queryKey: ["notif-unread"] });
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? "" : "Okunmamış: "}${item.title}`}
              accessibilityHint={item.link ? "İlgili sayfayı açar" : undefined}
              className={`mb-3 flex-row gap-3 rounded-3xl border p-4 active:opacity-70 ${
                item.read ? "border-border bg-surface" : "border-primary/20 bg-primary/5"
              }`}
            >
              <IconTile icon={Bell} tint={item.read ? colors.muted : colors.primary} size={40} />
              <View className="flex-1">
                <View className="flex-row items-start gap-2">
                  <Text className="flex-1 text-[15px] font-bold text-text" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View className={`mt-1.5 h-2 w-2 rounded-full ${item.read ? "bg-transparent" : "bg-primary"}`} />
                </View>
                {item.body ? (
                  <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <Text className="mt-2 text-xs text-muted-light">{formatRelative(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Bell}
              title="Bildirim yok"
              subtitle="Cevaplar, etkinlik hatırlatmaları ve mesajlar burada görünecek."
            />
          }
          ListFooterComponent={
            items.length >= 20 ? (
              <Text className="mt-2 text-center text-xs text-muted">Son 20 bildirim gösteriliyor.</Text>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
