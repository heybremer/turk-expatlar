import { useState } from "react";
import { Alert, Pressable, RefreshControl, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Bot,
  Briefcase,
  CalendarDays,
  Clock,
  Flag,
  Languages,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, LevelProgress } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LevelCard } from "@/components/ui/LevelCard";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { StarRating } from "@/components/ui/StarRating";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, ListGroup, ListRow, SectionHeader, SectionLabel } from "@/components/ui/kit";

type PublicUser = {
  id: string;
  role?: string;
  isBot?: boolean;
  editorTeam?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  levelProgress?: LevelProgress;
  reviewStats?: { averageRating: number; reviewCount: number };
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    occupation?: string | null;
    languages?: string[];
    interests?: string[];
    userStatus?: string | null;
    postalCountry?: "DE" | "TR" | null;
    state?: { name: string } | null;
    city?: { name: string; slug?: string } | null;
  } | null;
};

type Friendship =
  | { status: "SELF" | "NONE" }
  | { status: "FRIENDS" | "PENDING_SENT" | "PENDING_RECEIVED"; requestId: string };
type BlockStatus = { blockedByMe: boolean; blockedMe: boolean };
type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  editCount?: number;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl?: string | null };
};
type UserReviews = { reviews: Review[]; averageRating: number; reviewCount: number };

const REPORT_REASONS = [
  "Spam veya reklam",
  "Hakaret / nefret söylemi",
  "Dolandırıcılık",
  "Sahte profil",
  "Kişisel veri paylaşımı",
  "Diğer",
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];
const MAX_REVIEW_EDITS = 3;

function formatLastSeen(iso?: string | null) {
  if (!iso) return "Bilinmiyor";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(diffMin)) return "Bilinmiyor";
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function PublicUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user: me } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const isSelf = !!me && me.id === id;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");

  const profile = useQuery({
    queryKey: ["public-user", id],
    queryFn: () => api.get<PublicUser>(`/users/${id}/public`, token),
    enabled: !!id,
  });
  const friendship = useQuery({
    queryKey: ["friendship", id],
    queryFn: () => api.get<Friendship>(`/users/${id}/friendship-status`, token),
    enabled: !!id && !!token && !isSelf,
  });
  const blockStatus = useQuery({
    queryKey: ["block-status", id],
    queryFn: () => api.get<BlockStatus>(`/users/${id}/block-status`, token),
    enabled: !!id && !!token && !isSelf,
  });
  const reviews = useQuery({
    queryKey: ["user-reviews", id],
    queryFn: () => api.get<UserReviews>(`/users/${id}/reviews`, token),
    enabled: !!id,
  });

  const myReview = reviews.data?.reviews.find((r) => r.author.id === me?.id);

  const resetReviewForm = () => {
    setRating(0);
    setComment("");
    setEditingId(null);
    setReviewSubmitted(false);
  };

  const invalidateReviews = () => {
    void client.invalidateQueries({ queryKey: ["user-reviews", id] });
    void client.invalidateQueries({ queryKey: ["public-user", id] });
  };

  const saveReview = useMutation({
    mutationFn: () =>
      editingId
        ? api.patch(`/users/reviews/${editingId}`, { rating, comment: comment.trim() }, token)
        : api.post(`/users/${id}/reviews`, { rating, comment: comment.trim() }, token),
    onSuccess: () => {
      const wasEdit = !!editingId;
      resetReviewForm();
      invalidateReviews();
      Alert.alert("Teşekkürler", wasEdit ? "Değerlendirmen güncellendi." : "Değerlendirmen yayınlandı.");
    },
    onError: (error) =>
      Alert.alert("Değerlendirme gönderilemedi", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });

  const deleteReview = useMutation({
    mutationFn: (reviewId: string) => api.delete(`/users/reviews/${reviewId}`, token),
    onSuccess: () => {
      resetReviewForm();
      invalidateReviews();
    },
    onError: (error) =>
      Alert.alert("Silinemedi", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });

  const report = useMutation({
    mutationFn: () =>
      api.post(
        "/reports",
        { targetType: "USER", targetId: id, reason: reportReason, details: reportDetails.trim() || undefined },
        token,
      ),
    onSuccess: () => {
      setReportOpen(false);
      setReportDetails("");
      Alert.alert("Teşekkürler", "Şikâyetin moderasyon ekibine iletildi.");
    },
    onError: (error) =>
      Alert.alert("Gönderilemedi", error instanceof ApiError ? error.message : "Şikâyet gönderilemedi."),
  });

  const friendMut = useMutation({
    mutationFn: async (kind: "send" | "accept" | "reject" | "cancel" | "remove") => {
      const f = friendship.data;
      const requestId = f && "requestId" in f ? f.requestId : null;
      if (kind === "send") return api.post(`/users/${id}/friend-request`, {}, token);
      if (kind === "accept" && requestId) return api.post(`/users/friend-requests/${requestId}/accept`, {}, token);
      if ((kind === "reject" || kind === "cancel") && requestId)
        return api.delete(`/users/friend-requests/${requestId}`, token);
      if (kind === "remove") return api.delete(`/users/${id}/friend`, token);
      throw new ApiError("İstek bulunamadı", 404);
    },
    onError: (error) =>
      Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin."),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["friendship", id] });
      void client.invalidateQueries({ queryKey: ["friends"] });
      void client.invalidateQueries({ queryKey: ["friend-requests"] });
      void client.invalidateQueries({ queryKey: ["friend-requests-outgoing"] });
    },
  });

  const blockMut = useMutation({
    mutationFn: (block: boolean) =>
      block ? api.post(`/users/${id}/block`, {}, token) : api.delete(`/users/${id}/block`, token),
    onMutate: (block) => {
      client.setQueryData<BlockStatus>(["block-status", id], (prev) => ({
        blockedMe: prev?.blockedMe ?? false,
        blockedByMe: block,
      }));
    },
    onError: (error) => {
      Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin.");
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["block-status", id] });
      void client.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });

  const onRefresh = () => {
    void profile.refetch();
    void reviews.refetch();
    if (token && !isSelf) {
      void friendship.refetch();
      void blockStatus.refetch();
    }
  };

  if (profile.isLoading) {
    return (
      <Screen title="Kullanıcı profili" scroll={false}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (profile.isError || !profile.data?.profile) {
    return (
      <Screen title="Kullanıcı profili" scroll={false}>
        <ErrorState
          title="Kullanıcı bulunamadı"
          subtitle={profile.error instanceof ApiError ? profile.error.message : undefined}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  const user = profile.data;
  const p = user.profile!;
  const location = [p.city?.name, p.state?.name].filter(Boolean).join(", ");
  const status = friendship.data?.status;
  const blockedByMe = !!blockStatus.data?.blockedByMe;
  const blockedMe = !!blockStatus.data?.blockedMe;
  const avg = Number(user.reviewStats?.averageRating) || 0;

  const onFriendPress = () => {
    if (friendMut.isPending || !friendship.data) return;
    if (status === "NONE") friendMut.mutate("send");
    else if (status === "PENDING_SENT") friendMut.mutate("cancel");
    else if (status === "PENDING_RECEIVED")
      Alert.alert("Arkadaşlık isteği", `${p.displayName} sana arkadaşlık isteği gönderdi.`, [
        { text: "Vazgeç", style: "cancel" },
        { text: "Reddet", style: "destructive", onPress: () => friendMut.mutate("reject") },
        { text: "Kabul et", onPress: () => friendMut.mutate("accept") },
      ]);
    else if (status === "FRIENDS")
      Alert.alert("Arkadaşlıktan çıkar", `${p.displayName} arkadaş listenden çıkarılsın mı?`, [
        { text: "Vazgeç", style: "cancel" },
        { text: "Çıkar", style: "destructive", onPress: () => friendMut.mutate("remove") },
      ]);
  };

  const onBlockPress = () => {
    if (blockMut.isPending) return;
    if (blockedByMe) {
      blockMut.mutate(false);
      return;
    }
    Alert.alert(
      "Kullanıcıyı engelle",
      `${p.displayName} sana mesaj gönderemeyecek. Engeli Hesap ve Gizlilik sayfasından kaldırabilirsin.`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Engelle", style: "destructive", onPress: () => blockMut.mutate(true) },
      ],
    );
  };

  const friendLabel =
    status === "FRIENDS"
      ? "Arkadaşsınız"
      : status === "PENDING_SENT"
        ? "İsteği geri çek"
        : status === "PENDING_RECEIVED"
          ? "İsteği yanıtla"
          : "Arkadaş ekle";
  const friendIcon = status === "FRIENDS" ? UserCheck : status === "PENDING_SENT" ? UserX : UserPlus;

  const commentError =
    reviewSubmitted && comment.trim().length < 10 ? "Yorum en az 10 karakter olmalı" : null;
  const ratingError = reviewSubmitted && !rating ? "Bir puan seç" : null;
  const submitReview = () => {
    setReviewSubmitted(true);
    if (!rating || comment.trim().length < 10 || saveReview.isPending) return;
    saveReview.mutate();
  };
  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setRating(review.rating);
    setComment(review.comment ?? "");
    setReviewSubmitted(false);
  };
  const confirmDeleteReview = (review: Review) =>
    Alert.alert("Değerlendirmeyi sil", "Bu değerlendirme kalıcı olarak kaldırılsın mı?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteReview.mutate(review.id) },
    ]);
  const showReviewForm = !isSelf && !!token && (!myReview || !!editingId);

  return (
    <Screen
      title="Kullanıcı profili"
      subtitle={location || "Türk Expatlar üyesi"}
      keyboardAware
      refreshControl={
        <RefreshControl
          refreshing={profile.isRefetching || reviews.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Card className="overflow-hidden" padded={false}>
        <View className="h-24 overflow-hidden bg-primary-950">
          <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
        </View>
        <View className="-mt-10 items-center px-4 pb-5">
          <View className="rounded-full border-4 border-surface">
            <Avatar name={p.displayName} url={p.avatarUrl} size="xl" />
          </View>
          <View className="mt-3 flex-row items-center gap-2">
            <Text className="shrink text-xl font-extrabold text-text" numberOfLines={1}>
              {p.displayName}
            </Text>
            {p.postalCountry ? <Text>{p.postalCountry === "DE" ? "🇩🇪" : "🇹🇷"}</Text> : null}
          </View>
          {p.occupation ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <Briefcase size={13} color={colors.muted} />
              <Text className="text-sm text-muted">{p.occupation}</Text>
            </View>
          ) : null}
          <View className="mt-3 flex-row flex-wrap justify-center gap-2">
            {user.levelProgress ? <LevelCard levelProgress={user.levelProgress} compact /> : null}
            {user.isBot ? <Badge label="Otomatik hesap" color="primary" icon={Bot} /> : null}
            {user.editorTeam ? <Badge label={`Editör · ${user.editorTeam}`} color="accent" /> : null}
            {user.role === "ADMIN" ? <Badge label="Yönetici" color="warning" icon={ShieldCheck} /> : null}
            {user.role === "MODERATOR" ? <Badge label="Moderatör" color="warning" icon={ShieldCheck} /> : null}
            {location && p.city?.slug ? (
              <Pressable
                onPress={() => router.push(`/sehir/${p.city!.slug}` as never)}
                accessibilityRole="link"
                accessibilityLabel={`${location} şehir sayfası`}
                hitSlop={8}
              >
                <Badge label={location} color="muted" icon={MapPin} />
              </Pressable>
            ) : location ? (
              <Badge label={location} color="muted" icon={MapPin} />
            ) : null}
            {user.reviewStats?.reviewCount ? (
              <Badge label={`${avg.toFixed(1)} (${user.reviewStats.reviewCount})`} color="warning" icon={Star} />
            ) : null}
          </View>

          {isSelf ? (
            <Button
              label="Profili düzenle"
              icon={Pencil}
              variant="secondary"
              className="mt-5 w-full"
              onPress={() => router.push("/(tabs)/profil/duzenle" as never)}
            />
          ) : token ? (
            <>
              {blockedMe ? (
                <Text className="mt-4 text-center text-xs text-muted">
                  Bu kullanıcıyla etkileşim kısıtlanmış.
                </Text>
              ) : null}
              <View className="mt-5 w-full flex-row gap-2">
                <Button
                  label="Mesaj gönder"
                  icon={MessageCircle}
                  className="flex-1"
                  disabled={blockedByMe || blockedMe || user.isBot}
                  onPress={() => router.push(`/(tabs)/sohbet/dm-${id}` as never)}
                />
                <Button
                  label={friendLabel}
                  icon={friendIcon}
                  variant={status === "FRIENDS" ? "soft" : "secondary"}
                  className="flex-1"
                  loading={friendMut.isPending || friendship.isLoading}
                  disabled={!friendship.data || blockedByMe || blockedMe}
                  onPress={onFriendPress}
                />
              </View>
            </>
          ) : null}
        </View>
      </Card>

      {user.levelProgress ? (
        <View className="mt-4">
          <LevelCard levelProgress={user.levelProgress} />
        </View>
      ) : null}

      <SectionLabel>Hakkında</SectionLabel>
      <Card>
        <Text className="text-sm leading-6 text-text">
          {p.bio || "Kullanıcı henüz kendisi hakkında bilgi eklememiş."}
        </Text>
        {p.interests?.length ? (
          <>
            <Text className="mb-2 mt-4 text-xs font-semibold text-muted">İlgi alanları</Text>
            <View className="flex-row flex-wrap gap-2">
              {p.interests.map((interest) => (
                <Badge key={interest} label={interest} color="muted" />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <ListGroup className="mt-3">
        {p.languages?.length ? (
          <ListRow
            first
            icon={Languages}
            title="Diller"
            right={
              <Text className="max-w-[55%] text-right text-sm font-semibold text-text" numberOfLines={2}>
                {p.languages.join(", ")}
              </Text>
            }
          />
        ) : null}
        <ListRow
          first={!p.languages?.length}
          icon={CalendarDays}
          title="Üyelik tarihi"
          right={
            <Text className="text-sm font-semibold text-text">
              {new Date(user.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          }
        />
        <ListRow
          icon={Clock}
          title="Son giriş"
          right={<Text className="text-sm font-semibold text-text">{formatLastSeen(user.lastLoginAt)}</Text>}
        />
        {p.userStatus ? (
          <ListRow
            icon={ShieldCheck}
            title="Durum"
            right={<Text className="text-sm font-semibold text-text">{p.userStatus}</Text>}
          />
        ) : null}
      </ListGroup>

      {showReviewForm ? (
        <>
          <SectionLabel>{editingId ? "Değerlendirmeni düzenle" : "Bu üyeyi değerlendir"}</SectionLabel>
          <Card>
            <View className="flex-row justify-between">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= rating;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRating(value)}
                    className="h-12 w-12 items-center justify-center rounded-2xl bg-background active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={`${value} yıldız`}
                    accessibilityState={{ selected: active }}
                  >
                    <Star
                      size={24}
                      color={active ? colors.warning : colors.mutedLight}
                      fill={active ? colors.warning : "transparent"}
                    />
                  </Pressable>
                );
              })}
            </View>
            {ratingError ? <Text className="mt-2 text-xs font-medium text-danger">{ratingError}</Text> : null}
            <TextField
              label="Yorumun"
              value={comment}
              onChangeText={setComment}
              placeholder="Bu üyeyle deneyimini paylaş (en az 10 karakter)"
              multiline
              maxLength={1000}
              autoCapitalize="sentences"
              error={commentError}
              hint={`${comment.trim().length}/1000`}
              containerClassName="mb-0 mt-4"
            />
            <View className="mt-4 flex-row gap-2">
              {editingId ? (
                <Button label="Vazgeç" variant="secondary" className="flex-1" onPress={resetReviewForm} />
              ) : null}
              <Button
                label={editingId ? "Güncelle" : "Değerlendirmeyi gönder"}
                className="flex-1"
                loading={saveReview.isPending}
                onPress={submitReview}
              />
            </View>
          </Card>
        </>
      ) : null}

      <View className="mt-6">
        <SectionHeader title={`Değerlendirmeler (${reviews.data?.reviewCount ?? 0})`} />
        {reviews.isLoading ? (
          <View className="-m-4">
            <SkeletonList count={1} />
          </View>
        ) : reviews.isError ? (
          <Card>
            <Text className="text-sm text-muted">Değerlendirmeler yüklenemedi.</Text>
            <Button label="Tekrar dene" variant="soft" size="sm" className="mt-3 self-start" onPress={() => void reviews.refetch()} />
          </Card>
        ) : !reviews.data?.reviews.length ? (
          <Card>
            <Text className="text-sm text-muted">Henüz değerlendirme yok.</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {reviews.data.reviews.map((review) => {
              const mine = review.author.id === me?.id;
              const canEdit = mine && (review.editCount ?? 0) < MAX_REVIEW_EDITS;
              return (
                <Card key={review.id}>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => router.push(`/kullanici/${review.author.id}` as never)}
                      accessibilityRole="button"
                      accessibilityLabel={`${review.author.displayName} profilini aç`}
                      className="flex-1 flex-row items-center gap-3 active:opacity-70"
                    >
                      <Avatar name={review.author.displayName} url={review.author.avatarUrl} size="sm" />
                      <View className="flex-1">
                        <Text className="text-[15px] font-bold text-text" numberOfLines={1}>
                          {review.author.displayName}
                          {mine ? " (sen)" : ""}
                        </Text>
                        <Text className="text-xs text-muted">
                          {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                        </Text>
                      </View>
                    </Pressable>
                    <StarRating rating={review.rating} size={13} />
                  </View>
                  {review.comment ? (
                    <Text className="mt-3 text-sm leading-5 text-muted">{review.comment}</Text>
                  ) : null}
                  {mine && editingId !== review.id ? (
                    <View className="mt-3 flex-row gap-2">
                      {canEdit ? (
                        <Button
                          label="Düzenle"
                          size="sm"
                          variant="soft"
                          icon={Pencil}
                          onPress={() => startEdit(review)}
                        />
                      ) : null}
                      <Button
                        label="Sil"
                        size="sm"
                        variant="secondary"
                        icon={Trash2}
                        loading={deleteReview.isPending}
                        onPress={() => confirmDeleteReview(review)}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {!isSelf && token ? (
        <>
          <SectionLabel>Güvenlik</SectionLabel>
          {reportOpen ? (
            <Card>
              <Text className="mb-2 text-sm font-semibold text-text">Şikâyet sebebi</Text>
              <ChipRow
                options={REPORT_REASONS.map((r) => ({ value: r, label: r }))}
                value={reportReason}
                onChange={setReportReason}
              />
              <TextField
                label="Detay (isteğe bağlı)"
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Moderatörlere yardımcı olacak ek bilgi"
                multiline
                maxLength={1000}
                autoCapitalize="sentences"
                containerClassName="mb-0 mt-4"
              />
              <View className="mt-4 flex-row gap-2">
                <Button label="Vazgeç" variant="secondary" className="flex-1" onPress={() => setReportOpen(false)} />
                <Button
                  label="Şikâyet et"
                  variant="danger"
                  icon={Flag}
                  className="flex-1"
                  loading={report.isPending}
                  onPress={() => report.mutate()}
                />
              </View>
            </Card>
          ) : (
            <ListGroup>
              <ListRow first icon={Flag} tint={colors.warning} title="Kullanıcıyı şikâyet et" onPress={() => setReportOpen(true)} />
              <ListRow
                icon={Ban}
                destructive={!blockedByMe}
                title={blockedByMe ? "Engeli kaldır" : "Kullanıcıyı engelle"}
                subtitle={blockedByMe ? "Bu kullanıcıyı engelledin" : "Mesaj ve etkileşimleri engeller"}
                onPress={onBlockPress}
              />
            </ListGroup>
          )}
        </>
      ) : null}
    </Screen>
  );
}
