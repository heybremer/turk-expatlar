import { ExternalLink, MapPin, Search } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { DetailHeader, Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { api } from "@/lib/api";
import { colors } from "@/lib/colors";

type CalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  city: string;
  venue?: string;
  cost?: string;
  category?: string;
  ticketUrl?: string;
  detailUrl: string;
  source: "eventturk" | "platform";
};

type CalendarResponse = {
  items: CalendarEvent[];
  total: number;
  cities: string[];
  categories: string[];
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function EventCalendarScreen() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Almanya");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (city !== "Almanya") params.set("city", city);
      if (query.trim()) params.set("search", query.trim());
      const response = await api.get<CalendarResponse>(
        `/event-calendar/events?${params.toString()}`,
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etkinlikler yüklenemedi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 350);
    return () => clearTimeout(timer);
  }, [load]);

  const openEvent = async (event: CalendarEvent) => {
    const url = event.ticketUrl ?? event.detailUrl;
    if (/^https?:\/\//.test(url)) {
      await Linking.openURL(url);
    }
  };

  return (
    <Screen
      scroll={false}
      header={<DetailHeader title="Etkinlik Takvimi" />}
    >
      <View className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
        <Search size={19} color={colors.mutedLight} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Etkinlik, sanatçı veya mekân ara"
          placeholderTextColor={colors.mutedLight}
          className="min-h-12 flex-1 px-3 text-[15px] text-slate-900"
          returnKeyType="search"
          accessibilityLabel="Etkinlik ara"
        />
      </View>

      <View className="-mx-4 mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {["Almanya", ...(data?.cities ?? []).slice(0, 20)].map((item) => (
            <Pressable
              key={item}
              onPress={() => setCity(item)}
              className={`min-h-10 justify-center rounded-full px-4 ${
                city === item ? "bg-primary-600" : "border border-slate-200 bg-white"
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: city === item }}
            >
              <Text
                className={`font-bold ${
                  city === item ? "text-white" : "text-slate-600"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading && !data ? (
        <LoadingScreen />
      ) : error && !data ? (
        <ErrorState subtitle={error} onRetry={() => void load()} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Text className="mb-3 text-sm font-semibold text-slate-500">
            {data?.total ?? 0} etkinlik
          </Text>
          {!data?.items.length ? (
            <EmptyState
              title="Etkinlik bulunamadı"
              subtitle="Arama veya şehir filtresini değiştirmeyi dene."
            />
          ) : (
            <View className="gap-3">
              {data.items.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => void openEvent(event)}
                  disabled={event.source === "platform" && !event.ticketUrl}
                  className="rounded-3xl border border-slate-100 bg-white p-5 active:bg-slate-50"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-start">
                    <View className="mr-4 w-14 items-center rounded-2xl bg-primary-50 px-2 py-3">
                      <Text className="text-xs font-extrabold uppercase text-primary-600">
                        {new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(
                          new Date(event.startDate),
                        )}
                      </Text>
                      <Text className="text-2xl font-black text-primary-950">
                        {new Date(event.startDate).getDate()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-extrabold leading-6 text-slate-900">
                        {event.title}
                      </Text>
                      <Text className="mt-2 text-sm font-semibold text-primary-700">
                        {formatDate(event.startDate)}
                      </Text>
                      <View className="mt-2 flex-row items-center">
                        <MapPin size={14} color={colors.mutedLight} />
                        <Text className="ml-1 flex-1 text-sm text-slate-500">
                          {[event.venue, event.city].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="mt-4 flex-row items-center border-t border-slate-100 pt-3">
                    <Text className="flex-1 text-sm font-bold text-slate-600">
                      {event.cost ?? event.category ?? "Detayları incele"}
                    </Text>
                    {event.source === "eventturk" ? (
                      <ExternalLink size={16} color={colors.primary} />
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
