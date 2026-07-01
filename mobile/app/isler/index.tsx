import { useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, JobPosting } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackButton } from "@/components/ui/BackButton";

type JobsResponse = { items: JobPosting[]; total: number; page: number; totalPages: number };

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Tam Zamanlı", PART_TIME: "Yarı Zamanlı", MINIJOB: "Minijob",
  AUSBILDUNG: "Ausbildung", INTERNSHIP: "Staj", FREELANCE: "Freelance",
};

const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "Ofis", REMOTE: "Uzaktan", HYBRID: "Hibrit",
};

function JobCard({ job }: { job: JobPosting }) {
  const router = useRouter();
  const isSeeker = job.listingType === "SEEKER";
  return (
    <TouchableOpacity onPress={() => router.push(`/isler/${job.id}`)}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between gap-2 mb-1">
          <Text className="font-bold text-text flex-1" numberOfLines={1}>{job.title}</Text>
          <Badge label={isSeeker ? "İş Arıyor" : "İş İlanı"} color={isSeeker ? "warning" : "primary"} />
        </View>
        {job.company && (
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="business-outline" size={12} color="#6b7280" />
            <Text className="text-xs text-muted">{job.company}</Text>
          </View>
        )}
        <View className="flex-row items-center gap-1.5 mb-2">
          <Ionicons name="location-outline" size={12} color="#6b7280" />
          <Text className="text-xs text-muted">{job.city?.name ?? "—"} · {JOB_TYPE_LABELS[job.jobType] ?? job.jobType} · {WORK_MODE_LABELS[job.workMode] ?? job.workMode}</Text>
        </View>
        <Text className="text-sm text-muted" numberOfLines={2}>{job.description}</Text>
        <View className="mt-2 flex-row gap-2 flex-wrap">
          {job.turkishFriendly && <Badge label="🇹🇷 Türkçe" color="success" />}
          {job.salaryRange && <Badge label={job.salaryRange} color="muted" />}
          <Text className="text-xs text-muted self-center">{formatRelative(job.createdAt)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function IslerIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["jobs", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      return api.get<JobsResponse>(`/jobs?${params}`, token);
    },
    enabled: !!token,
  });

  return (
    <View className="flex-1 bg-background">
      <View className="bg-surface border-b border-border px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center gap-3 mb-3">
          <BackButton />
          <Text className="flex-1 text-xl font-bold text-text" numberOfLines={1}>İş İlanları</Text>
          <TouchableOpacity onPress={() => router.push("/isler/yeni")} className="bg-primary rounded-xl px-4 py-2">
            <Text className="text-white text-sm font-semibold">+ İlan Ver</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-background rounded-xl px-3 py-2 border border-border flex-row items-center">
          <Ionicons name="search-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
          <TextInput value={search} onChangeText={(v) => { setSearch(v); setPage(1); }} placeholder="İş ilanı ara…" placeholderTextColor="#9ca3af" className="flex-1 text-sm text-text" />
        </View>
      </View>

      {isLoading ? <LoadingScreen /> : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1a56db" />}
          renderItem={({ item }) => <JobCard job={item} />}
          ListEmptyComponent={<EmptyState icon="briefcase-outline" title="İlan bulunamadı" />}
        />
      )}
    </View>
  );
}
