import { Alert, Linking, Pressable, RefreshControl, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Clock,
  Euro,
  ExternalLink,
  Eye,
  FileText,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  UserRound,
  XCircle,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, JobPosting } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate, formatRelative } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { IconTile, MetaItem, SectionLabel, TipBox } from "@/components/ui/kit";

type JobDetail = JobPosting & {
  briefInfo?: string | null;
  cvUrl?: string | null;
  cvFileName?: string | null;
  viewCount?: number;
  expiresAt?: string | null;
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Tam zamanlı",
  PART_TIME: "Yarı zamanlı",
  MINIJOB: "Minijob",
  AUSBILDUNG: "Ausbildung",
  INTERNSHIP: "Staj",
  FREELANCE: "Freelance",
};
const WORK_MODE_LABELS: Record<string, string> = { ONSITE: "İşyerinde", REMOTE: "Remote", HYBRID: "Hibrit" };
const CATEGORY_LABELS: Record<string, string> = {
  yazilim: "Yazılım & IT",
  muhendislik: "Mühendislik",
  gastronomi: "Gastronomi & Turizm",
  saglik: "Sağlık",
  egitim: "Eğitim",
  lojistik: "Lojistik & Depo",
  satis: "Satış & Pazarlama",
  ofis: "Ofis & İdari",
  ticaret: "Ticaret & Perakende",
  diger: "Diğer",
};
const STATUS: Record<string, { label: string; color: "warning" | "success" | "danger" | "muted" }> = {
  PENDING: { label: "Onay bekliyor", color: "warning" },
  PUBLISHED: { label: "Yayında", color: "success" },
  CLOSED: { label: "Kapatıldı", color: "muted" },
  EXPIRED: { label: "Süresi doldu", color: "muted" },
  REJECTED: { label: "Reddedildi", color: "danger" },
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobDetail>(`/jobs/${id}`, token),
    enabled: !!id,
  });

  const closeMut = useMutation({
    mutationFn: () => api.patch(`/jobs/${id}/close`, {}, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["job", id] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => Alert.alert("İlan kapatılamadı", error instanceof Error ? error.message : "Tekrar deneyin."),
  });

  if (query.isLoading) return <LoadingScreen />;
  if (!query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen title="İş İlanı" scroll={false}>
        {notFound ? (
          <EmptyState
            icon={Briefcase}
            title="İlan bulunamadı"
            subtitle="İlan kaldırılmış veya henüz yayınlanmamış olabilir."
            actionLabel="İlanlara dön"
            onAction={() => router.back()}
          />
        ) : (
          <ErrorState
            title="İlan yüklenemedi"
            subtitle={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const data = query.data;
  const isSeeker = data.listingType === "SEEKER";
  const isOwner = !!user?.id && data.owner?.id === user.id;
  const isOpen = !data.status || data.status === "PUBLISHED";
  const status = data.status ? STATUS[data.status] : undefined;
  const location = [data.city?.name, data.state?.name].filter(Boolean).join(", ");
  const ownerName = data.owner?.profile?.displayName ?? "Üye";

  const share = () =>
    void Share.share({
      title: data.title,
      message: `${data.title}${data.company ? ` – ${data.company}` : ""}\nhttps://turkexpatlar.de/isler/${data.id}`,
    });

  const openDm = () => {
    if (!token) {
      router.push("/(auth)/giris" as never);
      return;
    }
    if (data.owner?.id) router.push(`/(tabs)/sohbet/dm-${data.owner.id}` as never);
  };

  const confirmClose = () =>
    Alert.alert("İlanı kapat", "İlan yayından kaldırılacak. Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kapat", style: "destructive", onPress: () => closeMut.mutate() },
    ]);

  return (
    <Screen
      title={data.title}
      subtitle={isSeeker ? "İş arayan" : "İş ilanı"}
      action={
        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Paylaş"
          className="h-11 w-11 items-center justify-center rounded-xl bg-background active:opacity-70"
        >
          <Share2 size={18} color={colors.text} />
        </Pressable>
      }
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />
      }
    >
      <Card>
        <View className="flex-row items-start gap-4">
          <IconTile icon={isSeeker ? UserRound : Briefcase} tint={isSeeker ? colors.warning : colors.primary} size={56} />
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-text">{data.title}</Text>
            <View className="mt-1.5 gap-1">
              {data.company && !isSeeker ? <MetaItem icon={Building2} label={data.company} /> : null}
              {location ? <MetaItem icon={MapPin} label={location} /> : null}
              {data.salaryRange ? (
                <MetaItem icon={Euro} label={isSeeker ? `Maaş beklentisi: ${data.salaryRange}` : data.salaryRange} />
              ) : null}
              <MetaItem icon={Clock} label={`${formatDate(data.createdAt)} yayınlandı`} />
              {data.viewCount ? <MetaItem icon={Eye} label={`${data.viewCount} görüntülenme`} /> : null}
            </View>
          </View>
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <Badge label={isSeeker ? "İş arıyor" : "İş ilanı"} color={isSeeker ? "warning" : "primary"} />
          <Badge label={JOB_TYPE_LABELS[data.jobType] ?? data.jobType} color="muted" />
          <Badge label={WORK_MODE_LABELS[data.workMode] ?? data.workMode} color="muted" />
          <Badge label={CATEGORY_LABELS[data.category] ?? data.category} color="muted" />
          {data.turkishFriendly && !isSeeker ? <Badge label="Türkçe işveren" icon={Languages} color="success" /> : null}
          {data.germanLevel ? <Badge label={`Almanca: ${data.germanLevel}`} color="accent" /> : null}
          {status && (isOwner || !isOpen) ? <Badge label={status.label} color={status.color} /> : null}
        </View>
      </Card>

      {isSeeker && data.briefInfo ? (
        <>
          <SectionLabel>Kısa bilgi</SectionLabel>
          <Card>
            <Text className="text-[15px] leading-6 text-text">{data.briefInfo}</Text>
          </Card>
        </>
      ) : null}

      {data.description && data.description !== data.briefInfo ? (
        <>
          <SectionLabel>{isSeeker ? "Detay" : "Açıklama"}</SectionLabel>
          <Card>
            <Text className="text-[15px] leading-6 text-text">{data.description}</Text>
          </Card>
        </>
      ) : null}

      {isSeeker && data.cvUrl ? (
        <>
          <SectionLabel>CV</SectionLabel>
          <Card>
            <Button
              label={data.cvFileName ?? "CV dosyasını aç"}
              icon={FileText}
              variant="secondary"
              onPress={() => void Linking.openURL(data.cvUrl!)}
            />
          </Card>
        </>
      ) : null}

      {!isOwner && isOpen ? (
        <>
          <SectionLabel>{isSeeker ? "İletişim" : "Başvuru"}</SectionLabel>
          <Card>
            {data.contactMethod === "EMAIL" && data.contactValue ? (
              <>
                <Text className="mb-3 text-sm text-muted">{data.contactValue}</Text>
                <Button
                  label={isSeeker ? "E-posta gönder" : "E-posta ile başvur"}
                  icon={Mail}
                  onPress={() =>
                    void Linking.openURL(`mailto:${data.contactValue}?subject=${encodeURIComponent(data.title)}`)
                  }
                />
              </>
            ) : null}
            {data.contactMethod === "EXTERNAL_URL" && data.contactValue ? (
              <>
                <Text className="mb-3 text-sm text-muted" numberOfLines={1}>
                  {data.contactValue}
                </Text>
                <Button label="Başvuru sayfasını aç" icon={ExternalLink} onPress={() => void Linking.openURL(data.contactValue!)} />
              </>
            ) : null}
            {data.contactMethod === "PLATFORM" || !data.contactMethod ? (
              <>
                <Text className="mb-3 text-sm text-muted">İlan sahibine uygulama içinden mesaj gönderebilirsin.</Text>
                <Button label="Mesaj gönder" icon={MessageCircle} onPress={openDm} disabled={!data.owner?.id} />
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionLabel>Yayınlayan</SectionLabel>
      <Card onPress={data.owner?.id && !isOwner ? () => router.push(`/kullanici/${data.owner!.id}` as never) : undefined}>
        <View className="flex-row items-center gap-3">
          <Avatar name={ownerName} size="md" />
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-text">{isOwner ? `${ownerName} (sen)` : ownerName}</Text>
            <Text className="text-xs text-muted">{formatRelative(data.createdAt)} yayınlandı</Text>
          </View>
        </View>
      </Card>

      {isOwner && data.status === "PENDING" ? (
        <View className="mt-4">
          <TipBox title="Onay bekliyor">İlanın moderasyon onayından sonra herkese görünür olacak.</TipBox>
        </View>
      ) : null}

      {isOwner && (data.status === "PUBLISHED" || data.status === "PENDING") ? (
        <Button
          label="İlanı kapat"
          icon={XCircle}
          variant="danger"
          className="mt-6"
          loading={closeMut.isPending}
          onPress={confirmClose}
        />
      ) : null}

      <View className="mt-6">
        <TipBox tone="warning" title="Dolandırıcılığa dikkat">
          Mülakat öncesi ücret, IBAN/şifre veya ön ödeme isteyen ilanları kesinlikle şikayet edin. Platform ödeme aracılığı yapmaz.
        </TipBox>
      </View>
    </Screen>
  );
}
