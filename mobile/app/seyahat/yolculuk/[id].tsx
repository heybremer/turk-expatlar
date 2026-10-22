import { useState } from "react";
import { Alert, Pressable, RefreshControl, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Euro,
  MessageCircle,
  Package,
  Plane,
  Send,
  Share2,
  Weight,
  XCircle,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ChatUserRef, TravelAnnouncement } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { IconTile, MetaItem, SectionLabel, Segmented, TipBox } from "@/components/ui/kit";

type Payment = "FREE" | "PAID" | "NEGOTIABLE";
type TravelOffer = {
  id: string;
  itemName: string;
  description?: string | null;
  weightKg?: number | null;
  paymentType: Payment;
  paymentAmount?: number | null;
  notes?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt?: string;
  requester: ChatUserRef;
};
type Detail = Omit<TravelAnnouncement, "requests"> & {
  requests: TravelOffer[];
  myRequest?: TravelOffer | null;
};

const REQUEST_STATUS: Record<string, { label: string; color: "warning" | "success" | "danger" | "muted" }> = {
  PENDING: { label: "Beklemede", color: "warning" },
  ACCEPTED: { label: "Kabul edildi", color: "success" },
  DECLINED: { label: "Reddedildi", color: "danger" },
  CANCELLED: { label: "İptal", color: "muted" },
};
const ANN_STATUS: Record<string, { label: string; color: "success" | "muted" }> = {
  OPEN: { label: "Açık", color: "success" },
  CLOSED: { label: "Kapalı", color: "muted" },
  EXPIRED: { label: "Süresi doldu", color: "muted" },
};
const PAYMENTS: { value: Payment; label: string }[] = [
  { value: "NEGOTIABLE", label: "Pazarlık" },
  { value: "PAID", label: "Ücretli" },
  { value: "FREE", label: "Ücretsiz" },
];

const toNumber = (v: string) => Number(v.replace(",", "."));
const paymentLabel = (type: Payment, amount?: number | null) =>
  type === "PAID" ? (amount ? `${amount} €` : "Ücretli") : type === "FREE" ? "Ücretsiz" : "Pazarlık";

export default function TravelAnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [paymentType, setPaymentType] = useState<Payment>("NEGOTIABLE");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const query = useQuery({
    queryKey: ["travel-announcement", id],
    queryFn: () => api.get<Detail>(`/travel-announcements/${id}`, token),
    enabled: !!id,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["travel-announcement", id] });
    void client.invalidateQueries({ queryKey: ["travel"] });
  };
  const onError = (error: unknown) =>
    Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin.");

  const weightNum = weight.trim() ? toNumber(weight) : undefined;
  const amountNum = paymentAmount.trim() ? toNumber(paymentAmount) : undefined;
  const errors = {
    itemName: itemName.trim().length < 2 ? "Eşya adını girin." : undefined,
    weight:
      weightNum !== undefined && (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 20)
        ? "Ağırlık 0–20 kg arasında olmalı."
        : undefined,
    paymentAmount:
      paymentType === "PAID" && (amountNum === undefined || !Number.isFinite(amountNum) || amountNum <= 0)
        ? "Teklif tutarını girin."
        : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const send = useMutation({
    mutationFn: () =>
      api.post(
        `/travel-announcements/${id}/requests`,
        {
          itemName: itemName.trim(),
          description: description.trim() || undefined,
          weightKg: weightNum,
          paymentType,
          paymentAmount: paymentType === "PAID" ? amountNum : undefined,
        },
        token,
      ),
    onSuccess: async () => {
      setItemName("");
      setDescription("");
      setWeight("");
      setPaymentAmount("");
      setSubmitted(false);
      await refresh();
      Alert.alert("Gönderildi", "Taşıma isteğin yolcuya iletildi.");
    },
    onError,
  });
  const respond = useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      api.patch(`/travel-announcements/${id}/requests/${requestId}/${accept ? "accept" : "decline"}`, {}, token),
    onSuccess: refresh,
    onError,
  });
  const close = useMutation({
    mutationFn: () => api.patch(`/travel-announcements/${id}/close`, {}, token),
    onSuccess: refresh,
    onError,
  });

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen title="Yolculuk ilanı" scroll={false}>
        {notFound ? (
          <EmptyState icon={Plane} title="İlan bulunamadı" subtitle="Bu ilan kaldırılmış olabilir." actionLabel="Geri dön" onAction={() => router.back()} />
        ) : (
          <ErrorState
            title="Yolculuk ilanı yüklenemedi"
            subtitle={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const item = query.data;
  const requests = item.requests ?? [];
  const departed = new Date(item.departureDate).getTime() <= Date.now();
  const canOffer = !item.isOwner && item.status === "OPEN" && !departed && !item.myRequest;
  const myStatus = item.myRequest ? REQUEST_STATUS[item.myRequest.status] : undefined;
  const annStatus = departed && item.status === "OPEN" ? ANN_STATUS.EXPIRED : ANN_STATUS[item.status] ?? ANN_STATUS.CLOSED;
  const respondingId = respond.isPending ? respond.variables?.requestId : undefined;

  const openDm = (userId?: string) => {
    if (!token) return router.push("/(auth)/giris" as never);
    if (userId) router.push(`/(tabs)/sohbet/dm-${userId}` as never);
  };
  const share = () =>
    void Share.share({
      title: `${item.fromCity} → ${item.toCity}`,
      message: `Yolculuk: ${item.fromCity} → ${item.toCity} (${formatDateTime(item.departureDate)})\nhttps://turkexpatlar.de/seyahat/yolculuk/${item.id}`,
    });

  return (
    <Screen
      title="Yolculuk ilanı"
      subtitle={`${item.fromCity} → ${item.toCity}`}
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
          <IconTile icon={Plane} size={56} />
          <View className="flex-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="text-xl font-extrabold text-text">{item.fromCity}</Text>
              <ArrowRight size={18} color={colors.muted} />
              <Text className="text-xl font-extrabold text-text">{item.toCity}</Text>
            </View>
            <View className="mt-1.5 gap-1">
              <MetaItem icon={CalendarDays} label={formatDateTime(item.departureDate)} />
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Badge label={item.direction === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪"} color="primary" />
          <Badge label={annStatus.label} color={annStatus.color} />
          {item.availableKg != null ? <Badge label={`${item.availableKg} kg boş kapasite`} icon={Weight} color="accent" /> : null}
          {item.isOwner && (item.requestCount ?? 0) > 0 ? <Badge label={`${item.requestCount} teklif`} color="warning" /> : null}
        </View>
        {item.notes ? <Text className="mt-4 text-[15px] leading-6 text-text">{item.notes}</Text> : null}
        <Text className="mt-2 text-xs text-muted">{formatRelative(item.createdAt)} yayınlandı</Text>
      </Card>

      {item.user && !item.isOwner ? (
        <>
          <SectionLabel>Yolcu</SectionLabel>
          <Card onPress={() => router.push(`/kullanici/${item.user!.id}` as never)}>
            <View className="flex-row items-center gap-3">
              <Avatar name={item.user.profile?.displayName ?? "Üye"} url={item.user.profile?.avatarUrl} size="md" />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-text">{item.user.profile?.displayName ?? "Üye"}</Text>
                <Text className="text-xs text-muted">Profili görüntüle</Text>
              </View>
            </View>
          </Card>
          <Button label="Mesaj gönder" icon={MessageCircle} variant="soft" className="mt-3" onPress={() => openDm(item.user?.id)} />
        </>
      ) : null}

      {canOffer ? (
        token ? (
          <>
            <SectionLabel>Eşya taşıma isteği gönder</SectionLabel>
            <Card>
              <TextField
                label="Eşya"
                icon={Package}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Taşınacak eşya"
                maxLength={150}
                error={show("itemName")}
              />
              <TextField
                label="Ağırlık (kg)"
                icon={Weight}
                value={weight}
                onChangeText={setWeight}
                placeholder="Örn. 2"
                keyboardType="decimal-pad"
                hint="İsteğe bağlı · en fazla 20 kg"
                error={show("weight")}
              />
              <Text className="mb-2 text-sm font-semibold text-text">Ödeme</Text>
              <Segmented options={PAYMENTS} value={paymentType} onChange={setPaymentType} className="mb-4" />
              {paymentType === "PAID" ? (
                <TextField
                  label="Teklif (€)"
                  icon={Euro}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Örn. 20"
                  keyboardType="decimal-pad"
                  error={show("paymentAmount")}
                />
              ) : null}
              <TextField
                label="Açıklama"
                value={description}
                onChangeText={setDescription}
                placeholder="Eşya ve teslim ayrıntıları"
                multiline
                maxLength={500}
              />
              <Button
                label="İstek gönder"
                icon={Send}
                disabled={submitted && hasErrors}
                loading={send.isPending}
                onPress={() => {
                  setSubmitted(true);
                  if (!hasErrors) send.mutate();
                }}
              />
            </Card>
          </>
        ) : (
          <Card className="mt-6">
            <Text className="text-sm text-muted">İstek göndermek için giriş yapmalısın.</Text>
            <Button label="Giriş yap" className="mt-3" onPress={() => router.push("/(auth)/giris" as never)} />
          </Card>
        )
      ) : null}

      {item.myRequest ? (
        <Card className="mt-6">
          <View className="flex-row items-center gap-3">
            <IconTile icon={Package} tint={item.myRequest.status === "ACCEPTED" ? colors.success : colors.warning} size={40} />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-text">İsteğin: {item.myRequest.itemName}</Text>
              <Text className="mt-0.5 text-xs text-muted">
                {item.myRequest.status === "ACCEPTED"
                  ? "Yolcu isteğini kabul etti. Ayrıntıları mesajla konuşabilirsin."
                  : "Yolcunun yanıtı burada görünür."}
              </Text>
            </View>
            <Badge label={myStatus?.label ?? item.myRequest.status} color={myStatus?.color ?? "muted"} />
          </View>
        </Card>
      ) : null}

      {item.isOwner ? (
        <>
          <SectionLabel count={requests.length}>Gelen istekler</SectionLabel>
          {requests.length === 0 ? (
            <TipBox>Henüz istek yok. Yeni istek geldiğinde bildirim alacaksın.</TipBox>
          ) : (
            <View className="gap-3">
              {requests.map((offer) => {
                const status = REQUEST_STATUS[offer.status];
                const busy = respondingId === offer.id;
                return (
                  <Card key={offer.id}>
                    <View className="flex-row items-start gap-3">
                      <Avatar name={offer.requester.profile?.displayName ?? "Üye"} url={offer.requester.profile?.avatarUrl} size="sm" />
                      <View className="flex-1">
                        <Text className="text-base font-bold text-text">{offer.itemName}</Text>
                        <Text className="mt-0.5 text-sm text-muted">{offer.requester.profile?.displayName ?? "Üye"}</Text>
                      </View>
                      <Badge label={status?.label ?? offer.status} color={status?.color ?? "muted"} />
                    </View>
                    <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
                      {offer.weightKg != null ? <MetaItem icon={Weight} label={`${offer.weightKg} kg`} /> : null}
                      <MetaItem icon={Euro} label={paymentLabel(offer.paymentType, offer.paymentAmount)} />
                    </View>
                    {offer.description ? <Text className="mt-2 text-sm leading-5 text-muted">{offer.description}</Text> : null}
                    {offer.status === "PENDING" ? (
                      <View className="mt-4 flex-row gap-2">
                        <Button
                          label="Kabul et"
                          icon={CircleCheck}
                          className="flex-1"
                          loading={busy && respond.variables?.accept === true}
                          disabled={respond.isPending}
                          onPress={() => respond.mutate({ requestId: offer.id, accept: true })}
                        />
                        <Button
                          label="Reddet"
                          variant="secondary"
                          className="flex-1"
                          loading={busy && respond.variables?.accept === false}
                          disabled={respond.isPending}
                          onPress={() => respond.mutate({ requestId: offer.id, accept: false })}
                        />
                      </View>
                    ) : null}
                    <Button
                      label="Mesaj gönder"
                      icon={MessageCircle}
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onPress={() => openDm(offer.requester.id)}
                    />
                  </Card>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {item.isOwner && item.status === "OPEN" ? (
        <Button
          label="İlanı kapat"
          icon={XCircle}
          variant="danger"
          className="mt-6"
          loading={close.isPending}
          onPress={() =>
            Alert.alert("İlanı kapat", "İlan kapatıldıktan sonra yeni istek alamazsın.", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Kapat", style: "destructive", onPress: () => close.mutate() },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}
