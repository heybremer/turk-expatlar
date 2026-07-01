import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type FederalStateOption = { id: string; name: string; slug: string };
type Holiday = { date: string; name: string; localName: string; type?: string };
type HolidaysResponse = { state: string; year: number; holidays: Holiday[] };

export default function TatilGunleri() {
  const { token, user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [stateSlug, setStateSlug] = useState(user?.profile?.state ? "" : "");

  const { data: states } = useQuery({
    queryKey: ["states-list"],
    queryFn: () => api.get<FederalStateOption[]>("/public-holidays/states", token),
    enabled: !!token,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["holidays", stateSlug, year],
    queryFn: () => api.get<HolidaysResponse>(`/public-holidays/holidays?year=${year}${stateSlug ? `&stateSlug=${stateSlug}` : ""}`, token),
    enabled: !!token,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title="Tatil Günleri" />

      {/* Yıl seçimi */}
      <View className="bg-surface border-b border-border px-4 py-3">
        <View className="flex-row items-center gap-3 mb-3">
          <Text className="text-sm font-medium text-text">Yıl:</Text>
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              className={`rounded-full px-4 py-1.5 border ${year === y ? "bg-primary border-primary" : "bg-background border-border"}`}
            >
              <Text className={`text-sm font-medium ${year === y ? "text-white" : "text-muted"}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setStateSlug("")}
            className={`rounded-full px-3 py-1.5 border ${stateSlug === "" ? "bg-primary border-primary" : "bg-background border-border"}`}
          >
            <Text className={`text-xs font-medium ${stateSlug === "" ? "text-white" : "text-muted"}`}>Tüm Almanya</Text>
          </TouchableOpacity>
          {states?.map((s) => (
            <TouchableOpacity
              key={s.slug}
              onPress={() => setStateSlug(s.slug)}
              className={`rounded-full px-3 py-1.5 border ${stateSlug === s.slug ? "bg-primary border-primary" : "bg-background border-border"}`}
            >
              <Text className={`text-xs font-medium ${stateSlug === s.slug ? "text-white" : "text-muted"}`}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : !data?.holidays.length ? (
        <EmptyState icon="calendar-outline" title="Tatil günü bulunamadı" />
      ) : (
        <FlatList
          data={data.holidays}
          keyExtractor={(h) => h.date}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => {
            const isPast = item.date < today;
            const isToday = item.date === today;
            return (
              <View className={`mb-2 flex-row items-center gap-3 rounded-2xl border p-4 ${isToday ? "border-primary bg-primary/5" : "border-border bg-surface"} ${isPast ? "opacity-50" : ""}`}>
                <View className="items-center w-12">
                  <Text className="text-xs font-bold text-muted">{item.date.slice(5, 7)}/{item.date.slice(8, 10)}</Text>
                  <Text className="text-xs text-muted">{item.date.slice(0, 4)}</Text>
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${isToday ? "text-primary" : "text-text"}`}>{item.localName}</Text>
                  {item.name !== item.localName && (
                    <Text className="text-xs text-muted">{item.name}</Text>
                  )}
                </View>
                {isToday && <Badge label="Bugün" color="primary" />}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
