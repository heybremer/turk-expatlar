import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, JobPosting } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Tam Zamanlı", PART_TIME: "Yarı Zamanlı", MINIJOB: "Minijob",
  AUSBILDUNG: "Ausbildung", INTERNSHIP: "Staj", FREELANCE: "Freelance",
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobPosting>(`/jobs/${id}`, token),
    enabled: !!id,
  });

  if (isLoading) return <LoadingScreen />;
  if (!data) {
    return (
      <View className="flex-1 bg-background">
        <DetailHeader title="İş İlanı" />
        <ErrorState title="İlan yüklenemedi" onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title={data.title} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <View className="flex-row flex-wrap gap-2 mb-3">
            <Badge label={data.listingType === "SEEKER" ? "İş Arıyor" : "İş İlanı"} color={data.listingType === "SEEKER" ? "warning" : "primary"} />
            <Badge label={JOB_TYPE_LABELS[data.jobType] ?? data.jobType} color="muted" />
            {data.turkishFriendly && <Badge label="🇹🇷 Türkçe" color="success" />}
          </View>

          <Text className="text-xl font-bold text-text mb-2">{data.title}</Text>
          {data.company && (
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="business-outline" size={14} color="#6b7280" />
              <Text className="text-sm text-muted">{data.company}</Text>
            </View>
          )}
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-muted">{data.city?.name ?? "—"}, {data.state?.name ?? ""}</Text>
          </View>
          {data.salaryRange && (
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="cash-outline" size={14} color="#6b7280" />
              <Text className="text-sm text-muted">{data.salaryRange}</Text>
            </View>
          )}
          {data.germanLevel && <Text className="text-sm text-muted mb-3">🇩🇪 Almanca: {data.germanLevel}</Text>}

          <Text className="text-sm text-text leading-6 mt-2">{data.description}</Text>
        </Card>

        {data.contactMethod && (
          <Card>
            <Text className="text-sm font-semibold text-muted mb-3">BAŞVURU</Text>
            {data.contactMethod === "EMAIL" && data.contactValue && (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${data.contactValue}`)} className="flex-row items-center gap-2">
                <Ionicons name="mail-outline" size={16} color="#6b7280" />
                <Text className="text-primary text-sm">{data.contactValue}</Text>
              </TouchableOpacity>
            )}
            {data.contactMethod === "EXTERNAL_URL" && data.contactValue && (
              <TouchableOpacity onPress={() => Linking.openURL(data.contactValue!)} className="flex-row items-center gap-2">
                <Ionicons name="link-outline" size={16} color="#6b7280" />
                <Text className="text-primary text-sm" numberOfLines={1}>{data.contactValue}</Text>
              </TouchableOpacity>
            )}
            {data.contactMethod === "PLATFORM" && (
              <Text className="text-sm text-muted">Platform üzerinden mesaj gönderin</Text>
            )}
          </Card>
        )}

        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-muted">Yayınlayan: {data.owner?.profile?.displayName ?? "Anonim"}</Text>
          <Text className="text-xs text-muted">· {formatRelative(data.createdAt)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
