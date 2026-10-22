import { useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, RefreshControl, Share, Text, View } from "react-native";
import {
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  Flag,
  Hourglass,
  LogOut,
  MapPin,
  Navigation,
  Pencil,
  Share2,
  Star,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Event } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDateTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { IconTile, SectionLabel, TipBox } from "@/components/ui/kit";
import { HeaderIconButton } from "@/components/navigation/AppHeader";

type AttendeeStatus = "GOING" | "INTERESTED";
type Person = {
  id: string;
  profile?: { displayName: string; avatarUrl?: string | null } | null;
};
type EventDetail = Omit<Event, "organizer"> & {
  organizer?: Person | null;
  attendees?: { status?: AttendeeStatus; user: Person }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  bulusma: "Buluşma",
  networking: "Networking",
  "yeni-gelenler": "Yeni gelenler",
  "dil-degisimi": "Dil değişimi",
  aile: "Aile",
  cocuk: "Çocuk",
  spor: "Spor",
  "kultur-sanat": "Kültür & sanat",
  ogrenci: "Öğrenci",
  girisimci: "Girişimci",
  seminer: "Seminer",
  online: "Online",
};

const REPORT_REASONS = ["Spam veya reklam", "Sahte / yanıltıcı etkinlik", "Uygunsuz içerik", "Diğer"];
const ATTENDEE_PREVIEW = 12;

function toCalendarStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function InfoRow({
  icon,
  title,
  subtitle,
  onPress,
  actionIcon: ActionIcon,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  actionIcon?: LucideIcon;
  accessibilityLabel?: string;
}) {
  const content = (
    <>
      <IconTile icon={icon} size={40} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text> : null}
      </View>
      {ActionIcon ? <ActionIcon size={18} color={colors.primary} /> : null}
    </>
  );
  if (!onPress) return <View className="flex-row items-center gap-3">{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      className="min-h-11 flex-row items-center gap-3 active:opacity-60"
    >
      {content}
    </Pressable>
  );
}

export default function EtkinlikDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [showAllAttendees, setShowAllAttendees] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get<EventDetail>(`/events/${id}`, token),
    enabled: !!token && !!id,
  });

  const attendMut = useMutation({
    mutationFn: (status: AttendeeStatus) => api.post(`/events/${id}/attend?status=${status}`, {}, token),
    onSuccess: (_res, status) => {
      void qc.invalidateQueries({ queryKey: ["event", id] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      if (status === "GOING") Alert.alert("Harika!", "Katılımın kaydedildi. Takvimine eklemeyi unutma.");
    },
    onError: (e) => Alert.alert("İşlem başarısız", e instanceof ApiError ? e.message : "Lütfen tekrar deneyin."),
  });

  const leaveMut = useMutation({
    mutationFn: () => api.delete(`/events/${id}/attend`, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["event", id] });
      void qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e) => Alert.alert("İşlem başarısız", e instanceof ApiError ? e.message : "Lütfen tekrar deneyin."),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/events/${id}`, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["events"] });
      router.back();
    },
    onError: (e) => Alert.alert("Silinemedi", e instanceof ApiError ? e.message : "Lütfen tekrar deneyin."),
  });

  const attendees = useMemo(() => {
    const list = data?.attendees ?? [];
    return [...list].sort((a, b) => (a.status === b.status ? 0 : a.status === "GOING" ? -1 : 1));
  }, [data?.attendees]);

  if (isLoading) return <LoadingScreen />;
  if (!data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Screen title="Etkinlik" scroll={false}>
        {notFound ? (
          <EmptyState
            icon={CalendarDays}
            title="Etkinlik bulunamadı"
            subtitle="Bu etkinlik silinmiş veya hiç oluşturulmamış olabilir."
            actionLabel="Etkinliklere dön"
            onAction={() => router.back()}
          />
        ) : (
          <ErrorState
            title="Etkinlik yüklenemedi"
            subtitle={error instanceof ApiError ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        )}
      </Screen>
    );
  }

  const event = data;
  const isPaid = event.priceType === "PAID";
  const organizerName = event.organizer?.profile?.displayName ?? "Düzenleyici";
  const attendeeCount = event._count?.attendees ?? attendees.length;
  const goingCount = attendees.filter((a) => a.status !== "INTERESTED").length;
  const interestedCount = attendees.length - goingCount;
  const myStatus = attendees.find((a) => a.user.id === user?.id)?.status ?? null;
  const isOrganizer = !!user?.id && user.id === event.organizer?.id;
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const isPast = (event.endsAt ? end : start).getTime() < Date.now();
  const isPublished = !event.status || event.status === "PUBLISHED";
  const isFull = !!event.capacity && attendeeCount >= event.capacity;
  const canAttend = !!token && !isOrganizer && isPublished && !isPast;
  const cityLine = [event.city?.name, event.state?.name].filter(Boolean).join(", ");
  const categoryLabel = event.category ? (CATEGORY_LABEL[event.category] ?? event.category) : null;
  const shareUrl = `https://turkexpatlar.de/etkinlikler/${event.id}`;

  function attend(status: AttendeeStatus) {
    if (attendMut.isPending || myStatus === status) return;
    attendMut.mutate(status);
  }

  function handleShare() {
    void Share.share({
      title: event.title,
      message: `${event.title}\n${formatDateTime(event.startsAt)} · ${event.city?.name ?? ""}\n\nTürk Expatlar Etkinlikler: ${shareUrl}`,
      url: shareUrl,
    });
  }

  function openMaps() {
    const query = encodeURIComponent([event.location, event.city?.name].filter(Boolean).join(", "));
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?q=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => Alert.alert("Hata", "Harita açılamadı"));
  }

  function addToCalendar() {
    if (Number.isNaN(start.getTime())) return;
    const params = [
      "action=TEMPLATE",
      `text=${encodeURIComponent(event.title)}`,
      `dates=${toCalendarStamp(start)}/${toCalendarStamp(end)}`,
      `details=${encodeURIComponent(`${event.description}\n\n${shareUrl}`)}`,
      `location=${encodeURIComponent([event.location, cityLine].filter(Boolean).join(", "))}`,
    ].join("&");
    Linking.openURL(`https://calendar.google.com/calendar/render?${params}`).catch(() =>
      Alert.alert("Hata", "Takvim açılamadı"),
    );
  }

  function report(reason: string) {
    api
      .post("/reports", { targetType: "EVENT", targetId: event.id, reason }, token)
      .then(() => Alert.alert("Teşekkürler", "Şikayetiniz moderatörlere iletildi."))
      .catch((e) => Alert.alert("Hata", e instanceof ApiError ? e.message : "Şikayet gönderilemedi"));
  }

  function openReport() {
    Alert.alert("Şikayet et", "Bu etkinliği şikayet etme sebebiniz nedir?", [
      ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => report(reason) })),
      { text: "Vazgeç", style: "cancel" as const },
    ]);
  }

  function confirmDelete() {
    Alert.alert("Etkinliği sil", "Bu etkinliği silmek istediğine emin misin? Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMut.mutate() },
    ]);
  }

  function confirmLeave() {
    Alert.alert("Katılımdan ayrıl", "Bu etkinlikten ayrılmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Ayrıl", style: "destructive", onPress: () => leaveMut.mutate() },
    ]);
  }

  const visibleAttendees = showAllAttendees ? attendees : attendees.slice(0, ATTENDEE_PREVIEW);

  return (
    <Screen
      title={event.title}
      subtitle={event.city?.name}
      action={<HeaderIconButton icon={Share2} label="Etkinliği paylaş" onPress={handleShare} />}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
      }
    >
      <View className="rounded-3xl bg-primary-950 p-6">
        <View className="mb-3 flex-row flex-wrap gap-2">
          {categoryLabel ? (
            <View className="rounded-full bg-white/15 px-2.5 py-1">
              <Text className="text-xs font-semibold text-white">{categoryLabel}</Text>
            </View>
          ) : null}
          <Badge label={isPaid ? `€${event.priceAmount ?? "?"}` : "Ücretsiz"} color={isPaid ? "warning" : "success"} />
          {event.status === "CANCELLED" ? <Badge label="İptal Edildi" color="danger" /> : null}
          {event.status === "PENDING_APPROVAL" ? <Badge label="Onay bekliyor" color="warning" /> : null}
          {isPast && isPublished ? <Badge label="Sona erdi" color="muted" /> : null}
          {isFull && !isPast ? <Badge label="Dolu" color="warning" /> : null}
        </View>
        <Text className="text-2xl font-extrabold text-white">{event.title}</Text>
        <Text className="mt-2 text-sm text-primary-100">
          {formatDateTime(event.startsAt)}
          {event.city?.name ? ` · ${event.city.name}` : ""}
        </Text>
      </View>

      {event.status === "PENDING_APPROVAL" && isOrganizer ? (
        <View className="mt-4">
          <TipBox title="Moderasyon onayı bekleniyor" tone="warning">
            Etkinliğin moderatörler tarafından onaylandıktan sonra listede görünecek ve katılım açılacak.
          </TipBox>
        </View>
      ) : null}

      <Card className="mt-4 gap-4">
        <InfoRow
          icon={CalendarDays}
          title={formatDateTime(event.startsAt)}
          subtitle={event.endsAt ? `Bitiş: ${formatDateTime(event.endsAt)}` : "Takvime eklemek için dokun"}
          onPress={addToCalendar}
          actionIcon={CalendarPlus}
          accessibilityLabel="Takvime ekle"
        />
        <InfoRow
          icon={MapPin}
          title={event.location}
          subtitle={cityLine || undefined}
          onPress={openMaps}
          actionIcon={Navigation}
          accessibilityLabel="Haritada göster"
        />
        <InfoRow
          icon={Users}
          title={event.capacity ? `${attendeeCount} / ${event.capacity} katılımcı` : `${attendeeCount} katılımcı`}
          subtitle={
            attendees.length > 0 ? `${goingCount} katılıyor · ${interestedCount} ilgileniyor` : "İlk katılan sen ol"
          }
        />
      </Card>

      <View className="mt-3 flex-row gap-2">
        <Button label="Takvime ekle" icon={CalendarPlus} size="sm" variant="secondary" className="flex-1" onPress={addToCalendar} />
        <Button label="Yol tarifi" icon={Navigation} size="sm" variant="secondary" className="flex-1" onPress={openMaps} />
      </View>

      <SectionLabel>Hakkında</SectionLabel>
      <Card>
        <Text className="text-[15px] leading-6 text-text" selectable>
          {event.description}
        </Text>
      </Card>

      {event.organizer ? (
        <>
          <SectionLabel>Düzenleyici</SectionLabel>
          <Card
            className="flex-row items-center gap-3"
            onPress={() => router.push(`/kullanici/${event.organizer!.id}` as never)}
          >
            <Avatar name={organizerName} url={event.organizer.profile?.avatarUrl} size="md" />
            <Text className="flex-1 text-[15px] font-bold text-text">{organizerName}</Text>
            {isOrganizer ? <Badge label="Sen" color="primary" /> : null}
          </Card>
        </>
      ) : null}

      {attendees.length > 0 ? (
        <>
          <SectionLabel count={attendees.length}>Katılımcılar</SectionLabel>
          <Card>
            <View className="flex-row flex-wrap gap-3">
              {visibleAttendees.map((a) => {
                const name = a.user.profile?.displayName ?? "Kullanıcı";
                return (
                  <Pressable
                    key={a.user.id}
                    onPress={() => router.push(`/kullanici/${a.user.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}, ${a.status === "INTERESTED" ? "ilgileniyor" : "katılıyor"}`}
                    className="w-16 items-center active:opacity-60"
                  >
                    <Avatar name={name} url={a.user.profile?.avatarUrl} size="md" />
                    <Text className="mt-1 text-center text-[11px] text-text" numberOfLines={1}>
                      {name}
                    </Text>
                    {a.status === "INTERESTED" ? <Text className="text-[10px] text-muted">ilgileniyor</Text> : null}
                  </Pressable>
                );
              })}
            </View>
            {attendees.length > ATTENDEE_PREVIEW ? (
              <Button
                label={showAllAttendees ? "Daha az göster" : `Tümünü göster (+${attendees.length - ATTENDEE_PREVIEW})`}
                size="sm"
                variant="ghost"
                className="mt-2"
                onPress={() => setShowAllAttendees((v) => !v)}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      {canAttend ? (
        <View className="mt-6 gap-2">
          {myStatus ? (
            <View className="flex-row items-center justify-center gap-1.5">
              <CircleCheck size={15} color={colors.success} />
              <Text className="text-sm font-semibold text-success">
                {myStatus === "GOING" ? "Bu etkinliğe katılıyorsun" : "Bu etkinlikle ilgileniyorsun"}
              </Text>
            </View>
          ) : null}
          <View className="flex-row gap-2">
            <Button
              label={myStatus === "GOING" ? "Katılıyorum" : isFull && !myStatus ? "Etkinlik dolu" : "Katıl"}
              icon={myStatus === "GOING" ? CircleCheck : UserPlus}
              variant={myStatus === "GOING" ? "soft" : "primary"}
              size="lg"
              className="flex-1"
              loading={attendMut.isPending && attendMut.variables === "GOING"}
              disabled={attendMut.isPending || myStatus === "GOING" || (isFull && !myStatus)}
              onPress={() => attend("GOING")}
            />
            <Button
              label="İlgileniyorum"
              icon={Star}
              variant={myStatus === "INTERESTED" ? "soft" : "secondary"}
              size="lg"
              className="flex-1"
              loading={attendMut.isPending && attendMut.variables === "INTERESTED"}
              disabled={attendMut.isPending || myStatus === "INTERESTED" || (isFull && !myStatus)}
              onPress={() => attend("INTERESTED")}
            />
          </View>
        </View>
      ) : !isOrganizer && isPast ? (
        <View className="mt-6 flex-row items-center justify-center gap-1.5">
          <Hourglass size={15} color={colors.muted} />
          <Text className="text-sm text-muted">Bu etkinlik sona erdi.</Text>
        </View>
      ) : null}

      {isOrganizer ? (
        <View className="mt-6 gap-2">
          <Button
            label="Etkinliği düzenle"
            icon={Pencil}
            variant="secondary"
            onPress={() => router.push(`/(tabs)/etkinlikler/yeni?editId=${event.id}` as never)}
          />
          <Button
            label="Etkinliği sil"
            icon={Trash2}
            variant="danger"
            loading={deleteMut.isPending}
            onPress={confirmDelete}
          />
        </View>
      ) : null}

      {token && !isOrganizer && myStatus ? (
        <Button
          label="Katılımdan ayrıl"
          icon={LogOut}
          variant="ghost"
          className="mt-6"
          loading={leaveMut.isPending}
          onPress={confirmLeave}
        />
      ) : null}

      {token && !isOrganizer ? (
        <Pressable
          onPress={openReport}
          accessibilityRole="button"
          accessibilityLabel="Etkinliği şikayet et"
          className="mt-4 min-h-11 flex-row items-center justify-center gap-1.5 self-center px-4 active:opacity-60"
        >
          <Flag size={14} color={colors.mutedLight} />
          <Text className="text-xs font-semibold text-muted">Etkinliği şikayet et</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
