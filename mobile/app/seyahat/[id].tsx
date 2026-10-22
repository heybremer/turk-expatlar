import { useState } from "react";
import { Alert, Pressable, RefreshControl, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock,
  Euro,
  MessageCircle,
  Package,
  Send,
  Share2,
  ShieldCheck,
  Tag,
  Weight,
  XCircle,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ChatUserRef, CourierRequest } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate, formatRelative } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, IconTile, ListGroup, ListRow, SectionLabel, TipBox } from "@/components/ui/kit";

type AcceptanceStatus = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED";
type Acceptance = {
  id: string;
  message?: string | null;
  travelDate?: string | null;
  status: AcceptanceStatus;
  createdAt?: string;
  traveler: ChatUserRef;
};
type Detail = Omit<CourierRequest, "status"> & {
  status: CourierRequest["status"] | "EXPIRED";
  isOwner: boolean;
  myAcceptance?: Acceptance | null;
  acceptances: Acceptance[];
  confirmedAcceptanceId?: string | null;
};

const STATUS: Record<string, { label: string; color: "success" | "primary" | "muted" | "danger" }> = {
  OPEN: { label: "Açık", color: "success" },
  MATCHED: { label: "Eşleşti", color: "primary" },
  COMPLETED: { label: "Tamamlandı", color: "muted" },
  CANCELLED: { label: "İptal edildi", color: "danger" },
  EXPIRED: { label: "Süresi doldu", color: "muted" },
};
const ACCEPTANCE_STATUS: Record<AcceptanceStatus, { label: string; color: "warning" | "success" | "danger" | "muted" }> = {
  PENDING: { label: "Onay bekliyor", color: "warning" },
  CONFIRMED: { label: "Onaylandı", color: "success" },
  DECLINED: { label: "Kabul edilmedi", color: "danger" },
  CANCELLED: { label: "İptal", color: "muted" },
};
const CATEGORY_LABELS: Record<string, string> = {
  electronics: "Elektronik",
  hediye: "Hediye",
  kitap: "Kitap",
  kiyafet: "Kıyafet",
  "ev-esyasi": "Ev eşyası",
  diger: "Diğer",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

/** "GG.AA.YYYY" veya "YYYY-AA-GG" biçimini (isteğe bağlı "SS:DD") Hermes'te güvenli ayrıştırır. */
function parseDateInput(value: string): Date | null {
  const v = value.trim();
  let y: number, mo: number, d: number, h = 12, mi = 0;
  const tr = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (tr) {
    [d, mo, y] = [Number(tr[1]), Number(tr[2]), Number(tr[3])];
    if (tr[4]) [h, mi] = [Number(tr[4]), Number(tr[5])];
  } else if (iso) {
    [y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (iso[4]) [h, mi] = [Number(iso[4]), Number(iso[5])];
  } else return null;
  if (h > 23 || mi > 59) return null;
  const date = new Date(y, mo - 1, d, h, mi);
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

export default function CourierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const query = useQuery({
    queryKey: ["courier", id],
    queryFn: () => api.get<Detail>(`/courier/requests/${id}`, token),
    enabled: !!id,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["courier", id] });
    void queryClient.invalidateQueries({ queryKey: ["travel"] });
  };
  const onError = (error: unknown) =>
    Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin.");

  const offerMut = useMutation({
    mutationFn: () => {
      const date = parseDateInput(travelDate);
      return api.post(
        `/courier/requests/${id}/accept`,
        { message: message.trim() || undefined, travelDate: date ? date.toISOString() : undefined },
        token,
      );
    },
    onSuccess: async () => {
      setMessage("");
      setTravelDate("");
      setSubmitted(false);
      await invalidate();
      Alert.alert("Teklif gönderildi", "Talep sahibi onaylarsa bildirim alacaksın.");
    },
    onError,
  });
  const patchMut = useMutation({
    mutationFn: (path: string) => api.patch(path, {}, token),
    onSuccess: invalidate,
    onError,
  });
  const pendingPath = patchMut.isPending ? patchMut.variables : undefined;

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen title="Eşya talebi" scroll={false}>
        {notFound ? (
          <EmptyState icon={Package} title="Talep bulunamadı" subtitle="Bu talep kaldırılmış olabilir." actionLabel="Geri dön" onAction={() => router.back()} />
        ) : (
          <ErrorState
            title="Taşıma talebi yüklenemedi"
            subtitle={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const item = query.data;
  const acceptances = item.acceptances ?? [];
  const st = STATUS[item.status] ?? { label: item.status, color: "muted" as const };
  const myStatus = item.myAcceptance ? ACCEPTANCE_STATUS[item.myAcceptance.status] : undefined;
  const iAmTraveler = item.myAcceptance?.status === "CONFIRMED";
  const confirmed = acceptances.find((a) => a.id === item.confirmedAcceptanceId || a.status === "CONFIRMED");
  const paymentLabel =
    item.paymentType === "FREE" ? "Ücretsiz" : item.paymentType === "PAID" ? (item.paymentAmount ? `${item.paymentAmount} €` : "Ücretli") : "Pazarlığa açık";
  const travelDateError = submitted && travelDate.trim() && !parseDateInput(travelDate) ? "Tarih biçimi: GG.AA.YYYY" : undefined;

  const openDm = (userId?: string) => {
    if (!token) return router.push("/(auth)/giris" as never);
    if (userId) router.push(`/(tabs)/sohbet/dm-${userId}` as never);
  };

  const share = () =>
    void Share.share({
      title: item.itemName,
      message: `${item.itemName}: ${item.fromArea} → ${item.toArea}\nhttps://turkexpatlar.de/seyahat/${item.id}`,
    });

  const today = new Date();
  const dateChips = [1, 3, 7, 14].map((days) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    return { value: toInput(d), label: days === 1 ? "Yarın" : days === 7 ? "1 hafta" : days === 14 ? "2 hafta" : `${days} gün` };
  });

  return (
    <Screen
      title="Eşya talebi"
      subtitle={`${item.fromArea} → ${item.toArea}`}
      keyboardAware
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
          <IconTile icon={Package} tint={colors.warning} size={56} />
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-text">{item.itemName}</Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Text className="shrink text-sm text-muted" numberOfLines={1}>
                {item.fromArea}
              </Text>
              <ArrowRight size={14} color={colors.mutedLight} />
              <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
                {item.toArea}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Badge label={item.direction === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪"} color="primary" />
          <Badge label={st.label} color={st.color} />
          {item.isOwner && (item.acceptanceCount ?? 0) > 0 ? <Badge label={`${item.acceptanceCount} teklif`} color="accent" /> : null}
        </View>
        <Text className="mt-4 text-[15px] leading-6 text-text">{item.notes || "Ek açıklama yok."}</Text>
        <Text className="mt-2 text-xs text-muted">{formatRelative(item.createdAt)} oluşturuldu</Text>
      </Card>

      <SectionLabel>Detaylar</SectionLabel>
      <ListGroup>
        <ListRow first icon={Tag} title="Kategori" right={<Value text={CATEGORY_LABELS[item.itemCategory] ?? item.itemCategory} />} />
        <ListRow icon={Weight} title="Ağırlık" right={<Value text={item.weightKg != null ? `${item.weightKg} kg` : "Belirtilmedi"} />} />
        {item.estimatedValueEur != null ? (
          <ListRow icon={ShieldCheck} title="Tahmini değer" right={<Value text={`${item.estimatedValueEur} €`} />} />
        ) : null}
        <ListRow icon={Euro} title="Ödeme" right={<Value text={paymentLabel} />} />
        <ListRow
          icon={CalendarDays}
          title="Tercih edilen tarih"
          right={<Value text={item.preferredDate ? formatDate(item.preferredDate) : "Esnek"} />}
        />
      </ListGroup>

      {item.owner && !item.isOwner ? (
        <>
          <SectionLabel>Talep sahibi</SectionLabel>
          <Card onPress={() => router.push(`/kullanici/${item.owner!.id}` as never)}>
            <View className="flex-row items-center gap-3">
              <Avatar name={item.owner.profile?.displayName ?? "Üye"} url={item.owner.profile?.avatarUrl} size="md" />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-text">{item.owner.profile?.displayName ?? "Üye"}</Text>
                <Text className="text-xs text-muted">Profili görüntüle</Text>
              </View>
            </View>
          </Card>
          <Button label="Mesaj gönder" icon={MessageCircle} variant="soft" className="mt-3" onPress={() => openDm(item.owner?.id)} />
        </>
      ) : null}

      {!item.isOwner && item.status === "OPEN" && !item.myAcceptance ? (
        token ? (
          <>
            <SectionLabel>Taşımayı teklif et</SectionLabel>
            <Card>
              <TextField
                label="Yolculuk tarihin"
                hint="İsteğe bağlı · GG.AA.YYYY"
                icon={CalendarDays}
                value={travelDate}
                onChangeText={setTravelDate}
                placeholder="15.10.2026"
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                error={travelDateError}
              />
              <ChipRow options={dateChips} value={travelDate} onChange={setTravelDate} className="-mt-2 mb-4" />
              <TextField
                label="Mesajın"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                placeholder="Güzergâhın, teslim şekli ve diğer ayrıntılar"
              />
              <Button
                label="Teklif gönder"
                icon={Send}
                loading={offerMut.isPending}
                onPress={() => {
                  setSubmitted(true);
                  if (travelDate.trim() && !parseDateInput(travelDate)) return;
                  offerMut.mutate();
                }}
              />
            </Card>
          </>
        ) : (
          <Card className="mt-6">
            <Text className="text-sm text-muted">Teklif vermek için giriş yapmalısın.</Text>
            <Button label="Giriş yap" className="mt-3" onPress={() => router.push("/(auth)/giris" as never)} />
          </Card>
        )
      ) : null}

      {item.myAcceptance ? (
        <Card className="mt-6">
          <View className="flex-row items-center gap-3">
            <IconTile icon={iAmTraveler ? CircleCheck : Clock} tint={iAmTraveler ? colors.success : colors.warning} size={40} />
            <View className="flex-1">
              <Text className="font-bold text-text">Teklifin</Text>
              <Text className="mt-0.5 text-sm text-muted">
                {iAmTraveler
                  ? "Teklifin onaylandı. Teslim ayrıntılarını mesajla konuşabilirsin."
                  : item.myAcceptance.status === "DECLINED"
                    ? "Talep sahibi başka bir taşıyıcıyı seçti."
                    : "Talep sahibinin onayı bekleniyor."}
              </Text>
            </View>
            {myStatus ? <Badge label={myStatus.label} color={myStatus.color} /> : null}
          </View>
        </Card>
      ) : null}

      {item.isOwner && confirmed && item.status !== "OPEN" ? (
        <>
          <SectionLabel>Taşıyıcı</SectionLabel>
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar name={confirmed.traveler.profile?.displayName ?? "Üye"} url={confirmed.traveler.profile?.avatarUrl} size="md" />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-text">{confirmed.traveler.profile?.displayName ?? "Üye"}</Text>
                {confirmed.travelDate ? <Text className="text-xs text-muted">Yolculuk: {formatDate(confirmed.travelDate)}</Text> : null}
              </View>
            </View>
            <Button label="Mesaj gönder" icon={MessageCircle} variant="soft" className="mt-3" onPress={() => openDm(confirmed.traveler.id)} />
          </Card>
        </>
      ) : null}

      {item.isOwner && item.status === "OPEN" ? (
        <>
          <SectionLabel count={acceptances.length}>Taşıyıcı teklifleri</SectionLabel>
          {acceptances.length === 0 ? (
            <TipBox>Henüz teklif yok. Teklif geldiğinde bildirim alacaksın.</TipBox>
          ) : (
            <View className="gap-3">
              {acceptances.map((offer) => {
                const path = `/courier/requests/${id}/confirm/${offer.id}`;
                const os = ACCEPTANCE_STATUS[offer.status];
                return (
                  <Card key={offer.id}>
                    <View className="flex-row items-center gap-3">
                      <Avatar name={offer.traveler.profile?.displayName ?? "Üye"} url={offer.traveler.profile?.avatarUrl} size="sm" />
                      <View className="flex-1">
                        <Text className="text-[15px] font-bold text-text">{offer.traveler.profile?.displayName ?? "Üye"}</Text>
                        {offer.travelDate ? <Text className="text-xs text-muted">Yolculuk: {formatDate(offer.travelDate)}</Text> : null}
                      </View>
                      {os && offer.status !== "PENDING" ? <Badge label={os.label} color={os.color} /> : null}
                    </View>
                    {offer.message ? <Text className="mt-3 text-sm leading-5 text-muted">{offer.message}</Text> : null}
                    <View className="mt-3 flex-row gap-2">
                      <Button
                        label="Onayla"
                        icon={CircleCheck}
                        className="flex-1"
                        loading={pendingPath === path}
                        disabled={patchMut.isPending}
                        onPress={() =>
                          Alert.alert("Teklifi onayla", "Diğer teklifler otomatik olarak reddedilecek.", [
                            { text: "Vazgeç", style: "cancel" },
                            { text: "Onayla", onPress: () => patchMut.mutate(path) },
                          ])
                        }
                      />
                      <Button
                        label="Mesaj"
                        icon={MessageCircle}
                        variant="secondary"
                        className="flex-1"
                        onPress={() => openDm(offer.traveler.id)}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {(item.isOwner || iAmTraveler) && item.status === "MATCHED" ? (
        <Button
          label="Teslim edildi olarak işaretle"
          icon={CircleCheck}
          size="lg"
          className="mt-6"
          loading={pendingPath === `/courier/requests/${id}/complete`}
          disabled={patchMut.isPending}
          onPress={() => patchMut.mutate(`/courier/requests/${id}/complete`)}
        />
      ) : null}
      {item.isOwner && (item.status === "OPEN" || item.status === "MATCHED") ? (
        <Button
          label="Talebi iptal et"
          icon={XCircle}
          variant="danger"
          className="mt-4"
          loading={pendingPath === `/courier/requests/${id}/cancel`}
          disabled={patchMut.isPending}
          onPress={() =>
            Alert.alert("Talebi iptal et", "Bu işlem geri alınamaz.", [
              { text: "Vazgeç", style: "cancel" },
              { text: "İptal et", style: "destructive", onPress: () => patchMut.mutate(`/courier/requests/${id}/cancel`) },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}

function Value({ text }: { text: string }) {
  return (
    <Text className="max-w-[55%] text-right text-sm font-semibold text-text" numberOfLines={2}>
      {text}
    </Text>
  );
}
