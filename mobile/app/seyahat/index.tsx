import { useState } from "react";
import { RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, CourierRequest, TravelAnnouncement } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";

type Tab = "requests" | "announcements";
type Direction = "" | "DE_TO_TR" | "TR_TO_DE";
type TravelResponse = {
  items: Array<CourierRequest | TravelAnnouncement>;
  total: number;
};

export default function TravelScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("requests");
  const [direction, setDirection] = useState<Direction>("");
  const path =
    tab === "requests"
      ? `/courier/requests?${direction ? `direction=${direction}` : ""}`
      : `/travel-announcements?${direction ? `direction=${direction}` : ""}`;
  const query = useQuery<TravelResponse>({
    queryKey: ["travel", tab, direction],
    queryFn: () =>
      tab === "requests"
        ? api.get<TravelResponse>(path)
        : api.get<TravelResponse>(path),
  });

  const items = query.data?.items ?? [];

  return (
    <Screen
      title="Seyahat"
      subtitle="Türkiye–Almanya arası taşıma topluluğu"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
      action={
        <TouchableOpacity
          onPress={() =>
            router.push(tab === "requests" ? "/seyahat/yeni" : "/seyahat/yolculuk/yeni")
          }
          className="h-10 w-10 items-center justify-center rounded-xl bg-primary"
          accessibilityLabel="Yeni ilan oluştur"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      }
    >
      <Card className="mb-4 border-warning/30 bg-warning/5">
        <View className="flex-row items-start gap-3">
          <Ionicons name="shield-checkmark-outline" size={21} color="#d97706" />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Yasaklı, ticari veya beyan edilmemiş eşya taşımayın. Ödeme ve teslim ayrıntılarını platformda açıkça konuşun.
          </Text>
        </View>
      </Card>

      <View className="mb-4 flex-row rounded-xl border border-border bg-surface p-1">
        <TabButton label="Eşya talepleri" active={tab === "requests"} onPress={() => setTab("requests")} />
        <TabButton label="Yolculuk ilanları" active={tab === "announcements"} onPress={() => setTab("announcements")} />
      </View>

      <View className="mb-5 flex-row gap-2">
        {[
          ["", "Tümü"],
          ["DE_TO_TR", "DE → TR"],
          ["TR_TO_DE", "TR → DE"],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            onPress={() => setDirection(value as Direction)}
            className={`min-h-10 flex-1 items-center justify-center rounded-full border ${
              direction === value ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <Text className={direction === value ? "font-semibold text-primary" : "text-muted"}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {query.isLoading ? (
        <LoadingScreen />
      ) : query.isError ? (
        <ErrorState title="Seyahat ilanları yüklenemedi" onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="airplane-outline"
          title="Henüz ilan yok"
          subtitle="Bu yöndeki ilk ilanı siz oluşturabilirsiniz."
        />
      ) : (
        <View className="gap-3">
          {tab === "requests"
            ? (items as CourierRequest[]).map((item) => (
                <CourierCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/seyahat/${item.id}` as never)}
                />
              ))
            : (items as TravelAnnouncement[]).map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/seyahat/yolculuk/${item.id}` as never)}
                />
              ))}
        </View>
      )}
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`min-h-11 flex-1 items-center justify-center rounded-lg ${active ? "bg-primary" : ""}`}
    >
      <Text className={active ? "font-semibold text-white" : "font-medium text-muted"}>{label}</Text>
    </TouchableOpacity>
  );
}

function CourierCard({ item, onPress }: { item: CourierRequest; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card>
        <View className="flex-row items-center justify-between">
          <Badge label={item.direction === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪"} color="primary" />
          <Badge
            label={item.status === "OPEN" ? "Açık" : item.status === "MATCHED" ? "Eşleşti" : item.status}
            color={item.status === "OPEN" ? "success" : "muted"}
          />
        </View>
        <Text className="mt-3 text-base font-bold text-text">{item.itemName}</Text>
        <Text className="mt-1 text-sm text-muted">{item.fromArea} → {item.toArea}</Text>
        <View className="mt-3 flex-row gap-3">
          {item.weightKg != null && <Text className="text-xs text-muted">{item.weightKg} kg</Text>}
          <Text className="text-xs text-muted">
            {item.paymentType === "FREE" ? "Ücretsiz" : item.paymentType === "PAID" ? "Ücretli" : "Pazarlık"}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function AnnouncementCard({ item, onPress }: { item: TravelAnnouncement; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card>
        <View className="flex-row items-center justify-between">
          <Badge label={item.direction === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪"} color="primary" />
          {item.availableKg != null && <Badge label={`${item.availableKg} kg`} color="muted" />}
        </View>
        <Text className="mt-3 text-base font-bold text-text">{item.fromCity} → {item.toCity}</Text>
        <Text className="mt-1 text-sm text-muted">
          {new Date(item.departureDate).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
        {item.notes && <Text className="mt-2 text-sm text-muted" numberOfLines={2}>{item.notes}</Text>}
      </Card>
    </TouchableOpacity>
  );
}
