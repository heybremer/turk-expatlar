import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Clock,
  Euro,
  Languages,
  MapPin,
  SlidersHorizontal,
  UserRound,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, FederalState, JobPosting } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, HeaderButton, IconTile, MetaItem, Segmented } from "@/components/ui/kit";
import { DetailHeader } from "@/components/navigation/DetailHeader";

const PAGE_SIZE = 20;

type JobsResponse = { items: JobPosting[]; total: number; page: number; limit: number; totalPages: number };
type ListingFilter = "" | "EMPLOYER" | "SEEKER";

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Tam zamanlı",
  PART_TIME: "Yarı zamanlı",
  MINIJOB: "Minijob",
  AUSBILDUNG: "Ausbildung",
  INTERNSHIP: "Staj",
  FREELANCE: "Freelance",
};
const WORK_MODE_LABELS: Record<string, string> = { ONSITE: "İşyerinde", REMOTE: "Remote", HYBRID: "Hibrit" };
const JOB_CATEGORIES = [
  { value: "yazilim", label: "Yazılım & IT" },
  { value: "muhendislik", label: "Mühendislik" },
  { value: "gastronomi", label: "Gastronomi & Turizm" },
  { value: "saglik", label: "Sağlık" },
  { value: "egitim", label: "Eğitim" },
  { value: "lojistik", label: "Lojistik & Depo" },
  { value: "satis", label: "Satış & Pazarlama" },
  { value: "ofis", label: "Ofis & İdari" },
  { value: "ticaret", label: "Ticaret & Perakende" },
  { value: "diger", label: "Diğer" },
];

const LISTING_OPTIONS: { value: ListingFilter; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "EMPLOYER", label: "İşveren" },
  { value: "SEEKER", label: "İş arayan" },
];
const JOB_TYPE_OPTIONS = [{ value: "", label: "Tüm çalışma tipleri" }, ...Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const WORK_MODE_OPTIONS = [{ value: "", label: "Her çalışma şekli" }, ...Object.entries(WORK_MODE_LABELS).map(([value, label]) => ({ value, label }))];
const CATEGORY_OPTIONS = [{ value: "", label: "Tüm kategoriler" }, ...JOB_CATEGORIES];

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function JobCard({ job }: { job: JobPosting }) {
  const router = useRouter();
  const isSeeker = job.listingType === "SEEKER";
  const meta = [job.city?.name, JOB_TYPE_LABELS[job.jobType] ?? job.jobType, WORK_MODE_LABELS[job.workMode] ?? job.workMode]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card className="mb-3" onPress={() => router.push(`/isler/${job.id}`)}>
      <View className="flex-row items-start gap-3">
        <IconTile icon={isSeeker ? UserRound : Briefcase} tint={isSeeker ? colors.warning : colors.primary} />
        <View className="flex-1">
          <Text className="text-base font-bold text-text" numberOfLines={2}>
            {job.title}
          </Text>
          <View className="mt-1 gap-1">
            {job.company && !isSeeker ? <MetaItem icon={Building2} label={job.company} /> : null}
            <MetaItem icon={MapPin} label={meta} />
          </View>
        </View>
      </View>
      {job.description ? (
        <Text className="mt-3 text-sm leading-5 text-muted" numberOfLines={2}>
          {job.description}
        </Text>
      ) : null}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Badge label={isSeeker ? "İş arıyor" : "İş ilanı"} color={isSeeker ? "warning" : "primary"} />
        {job.turkishFriendly && !isSeeker ? <Badge label="Türkçe" icon={Languages} color="success" /> : null}
        {job.salaryRange ? <Badge label={job.salaryRange} icon={Euro} color="muted" /> : null}
        <View className="ml-auto">
          <MetaItem icon={Clock} label={formatRelative(job.createdAt)} />
        </View>
      </View>
    </Card>
  );
}

export default function IslerIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<ListingFilter>("");
  const [jobType, setJobType] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [category, setCategory] = useState("");
  const [stateId, setStateId] = useState("");
  const [turkishFriendly, setTurkishFriendly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounced(search.trim());

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states"),
    staleTime: 60 * 60 * 1000,
  });

  const filters = { search: debouncedSearch, listingType, jobType, workMode, category, stateId, turkishFriendly };
  const query = useInfiniteQuery({
    queryKey: ["jobs", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (listingType) params.set("listingType", listingType);
      if (jobType) params.set("jobType", jobType);
      if (workMode) params.set("workMode", workMode);
      if (category) params.set("category", category);
      if (stateId) params.set("stateId", stateId);
      if (turkishFriendly) params.set("turkishFriendly", "true");
      return api.get<JobsResponse>(`/jobs?${params}`, token);
    },
    getNextPageParam: (last) => (last.page < (last.totalPages ?? 0) ? last.page + 1 : undefined),
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items ?? []) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total;
  const extraFilterCount = [jobType, workMode, category, stateId, turkishFriendly].filter(Boolean).length;
  const hasFilters = Boolean(debouncedSearch || listingType || extraFilterCount);

  const clearFilters = () => {
    setSearch("");
    setListingType("");
    setJobType("");
    setWorkMode("");
    setCategory("");
    setStateId("");
    setTurkishFriendly(false);
  };

  const stateOptions = [
    { value: "", label: "Tüm eyaletler" },
    ...(states ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Screen
      scroll={false}
      header={
        <DetailHeader
          title="İş İlanları"
          subtitle={total !== undefined ? `${total} ilan` : "İş ilanları ve iş arayanlar"}
          action={<HeaderButton label="İlan ver" onPress={() => router.push("/isler/yeni")} />}
        >
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <SearchBar value={search} onChangeText={setSearch} placeholder="Pozisyon, şirket ara…" />
            </View>
            <Pressable
              onPress={() => setShowFilters((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showFilters ? "Filtreleri gizle" : "Filtreleri göster"}
              accessibilityState={{ expanded: showFilters }}
              className={`h-11 min-w-11 flex-row items-center justify-center gap-1 rounded-2xl px-3 ${
                showFilters || extraFilterCount ? "bg-primary/10" : "bg-background"
              }`}
            >
              <SlidersHorizontal size={18} color={showFilters || extraFilterCount ? colors.primary : colors.muted} />
              {extraFilterCount ? <Text className="text-xs font-bold text-primary">{extraFilterCount}</Text> : null}
            </Pressable>
          </View>
          <Segmented className="mt-3" options={LISTING_OPTIONS} value={listingType} onChange={setListingType} />
        </DetailHeader>
      }
    >
      <FlatList
        data={query.isLoading || query.isError ? [] : items}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          showFilters ? (
            <View className="mb-4 gap-3">
              <ChipRow options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
              <ChipRow options={JOB_TYPE_OPTIONS} value={jobType} onChange={setJobType} />
              <ChipRow options={WORK_MODE_OPTIONS} value={workMode} onChange={setWorkMode} />
              <ChipRow options={stateOptions} value={stateId} onChange={setStateId} />
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setTurkishFriendly((v) => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: turkishFriendly }}
                  className={`min-h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
                    turkishFriendly ? "border-primary bg-primary/10" : "border-border bg-surface"
                  }`}
                >
                  <Languages size={14} color={turkishFriendly ? colors.primary : colors.muted} />
                  <Text className={`text-sm font-semibold ${turkishFriendly ? "text-primary" : "text-muted"}`}>
                    Türkçe işveren
                  </Text>
                </Pressable>
                {hasFilters ? (
                  <Pressable onPress={clearFilters} accessibilityRole="button" className="min-h-9 justify-center px-2">
                    <Text className="text-sm font-semibold text-primary">Temizle</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => <JobCard job={item} />}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="-mx-4">
              <SkeletonList count={4} />
            </View>
          ) : query.isError ? (
            <ErrorState
              subtitle={query.error instanceof Error ? query.error.message : undefined}
              onRetry={() => void query.refetch()}
            />
          ) : hasFilters ? (
            <EmptyState
              icon={Briefcase}
              title="Sonuç bulunamadı"
              subtitle="Bu filtrelere uygun ilan yok."
              actionLabel="Filtreleri temizle"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="Henüz ilan yok"
              subtitle="İlk iş ilanını sen ver."
              actionLabel="İlan ver"
              onAction={() => router.push("/isler/yeni")}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
