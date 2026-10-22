import { useEffect, useState } from "react";
import { Linking, RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, PartyPopper } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, API_URL } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, SectionLabel, Segmented, StatTile, ToolHero } from "@/components/ui/kit";

type Holiday = {
  date: string;
  nameDe: string;
  nameTr: string;
  nationwide: boolean;
  isPublicHoliday: boolean;
  childrenRelated: boolean;
  noteTr?: string;
};
type HolidaysResponse = {
  state: string;
  year: number;
  holidays: Holiday[];
  total: number;
  officialCount: number;
  childrenCount: number;
};
type Kind = "all" | "official" | "children";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "official", label: "Resmî" },
  { value: "children", label: "Çocuk & okul" },
];
const DEFAULT_STATE = "Berlin";

const atNoon = (date: string) => new Date(`${date}T12:00:00`);
const monthShort = (date: string) => new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(atNoon(date));
const weekday = (date: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(atNoon(date));
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysUntil = (date: string) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - start) / 86_400_000);
};

export default function TatilGunleri() {
  const profileState = useAuth((s) => s.user?.profile?.state?.name);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [stateName, setStateName] = useState(profileState ?? DEFAULT_STATE);
  const [kind, setKind] = useState<Kind>("all");

  const statesQuery = useQuery({
    queryKey: ["holiday-states"],
    queryFn: () => api.get<string[]>("/public-holidays/states"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const states = statesQuery.data ?? [];

  useEffect(() => {
    if (states.length && !states.includes(stateName)) setStateName(DEFAULT_STATE);
  }, [states, stateName]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["holidays", stateName, year],
    queryFn: () =>
      api.get<HolidaysResponse>(`/public-holidays?state=${encodeURIComponent(stateName)}&year=${year}`),
    staleTime: 60 * 60 * 1000,
  });

  const today = localToday();
  const all = data?.holidays ?? [];
  const holidays = all.filter((h) =>
    kind === "official" ? h.isPublicHoliday : kind === "children" ? h.childrenRelated : true,
  );
  const upcoming = all.find((h) => h.date >= today && h.isPublicHoliday);
  const upcomingDays = upcoming ? daysUntil(upcoming.date) : null;

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((y) => ({ value: String(y), label: String(y) }));
  const stateOptions = states.map((s) => ({ value: s, label: s }));
  const icsUrl = `${API_URL}/public-holidays/feed.ics?state=${encodeURIComponent(stateName)}&year=${year}`;

  return (
    <Screen
      title="Tatil Günleri"
      subtitle={`${stateName} · ${year}`}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
      }
    >
      <ToolHero
        icon={PartyPopper}
        tint={colors.warning}
        title="Resmî Tatiller"
        subtitle="Eyaletine göre Almanya'daki resmî tatil ve özel günler."
      >
        <Segmented options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} />
      </ToolHero>

      <Text className="mb-2 text-sm font-bold text-text">Eyalet</Text>
      {statesQuery.isError ? (
        <Text className="text-sm text-danger">Eyalet listesi yüklenemedi.</Text>
      ) : (
        <ChipRow options={stateOptions} value={stateName} onChange={setStateName} />
      )}

      {upcoming && year === currentYear ? (
        <View className="mt-4 rounded-3xl border border-primary/20 bg-primary/5 p-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">Sıradaki tatil</Text>
          <Text className="mt-1 text-lg font-extrabold text-text">{upcoming.nameTr}</Text>
          <Text className="mt-0.5 text-sm text-muted">
            {`${Number(upcoming.date.slice(8, 10))} ${monthShort(upcoming.date)} · ${weekday(upcoming.date)} · `}
            {upcomingDays === 0 ? "Bugün" : upcomingDays === 1 ? "Yarın" : `${upcomingDays} gün kaldı`}
          </Text>
        </View>
      ) : null}

      {data ? (
        <View className="mt-4 flex-row gap-2">
          <StatTile value={data.total} label="Toplam" />
          <StatTile value={data.officialCount} label="Resmî" />
          <StatTile value={data.childrenCount} label="Çocuk & okul" />
        </View>
      ) : null}

      <Segmented className="mt-4" options={KIND_OPTIONS} value={kind} onChange={setKind} />

      {isLoading ? (
        <View className="-mx-4 mt-2">
          <SkeletonList count={5} />
        </View>
      ) : isError ? (
        <ErrorState subtitle={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      ) : holidays.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Tatil günü bulunamadı" subtitle="Farklı bir yıl, eyalet veya filtre seçin." />
      ) : (
        <>
          <SectionLabel count={holidays.length}>{`${year} tatilleri`}</SectionLabel>
          <View className="gap-3">
            {holidays.map((item) => {
              const isPast = item.date < today;
              const isToday = item.date === today;
              const isNext = !isToday && upcoming?.date === item.date;
              return (
                <View
                  key={`${item.date}-${item.nameDe}`}
                  className={`flex-row items-center gap-4 rounded-3xl border p-4 ${
                    isToday ? "border-primary bg-primary/5" : "border-border bg-surface"
                  } ${isPast ? "opacity-50" : "opacity-100"}`}
                >
                  <View className="w-14 items-center rounded-2xl bg-primary-50 px-2 py-2">
                    <Text className="text-xs font-extrabold uppercase text-primary-600">{monthShort(item.date)}</Text>
                    <Text className="text-2xl font-black text-primary-950">{Number(item.date.slice(8, 10))}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-bold ${isToday ? "text-primary" : "text-text"}`}>{item.nameTr}</Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      {weekday(item.date)}
                      {item.nameDe !== item.nameTr ? ` · ${item.nameDe}` : ""}
                    </Text>
                    {item.noteTr ? <Text className="mt-1 text-xs leading-4 text-muted">{item.noteTr}</Text> : null}
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {item.isPublicHoliday ? (
                        <Badge label={item.nationwide ? "Tüm Almanya" : "Eyalet tatili"} color={item.nationwide ? "primary" : "accent"} />
                      ) : (
                        <Badge label="Özel gün" color="muted" />
                      )}
                      {item.childrenRelated ? <Badge label="Çocuk" color="success" /> : null}
                    </View>
                  </View>
                  {isToday ? <Badge label="Bugün" color="primary" /> : null}
                  {isNext ? <Badge label="Sıradaki" color="warning" /> : null}
                </View>
              );
            })}
          </View>
          <Button
            label="Takvimime ekle (.ics)"
            icon={CalendarPlus}
            variant="secondary"
            className="mt-5"
            onPress={() => void Linking.openURL(icsUrl)}
          />
        </>
      )}
    </Screen>
  );
}
