import { useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Clock,
  Globe,
  Languages,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Send,
  Share2,
  Star,
  Store,
  Trash2,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Business } from "@/lib/api";
import { colors } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { StarRating } from "@/components/ui/StarRating";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { IconTile, LinkRow, MetaItem, SectionLabel } from "@/components/ui/kit";

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { profile?: { displayName: string; avatarUrl?: string | null } | null } | null;
};
type MyReview = {
  id: string;
  rating: number;
  comment?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  editCount: number;
  createdAt: string;
};
type BusinessDetail = Business & {
  reviews?: Review[];
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus?: string;
};

function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="mb-4 mt-3 flex-row gap-2">
      {[1, 2, 3, 4, 5].map((v) => {
        const active = v <= value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            className={`h-11 w-11 items-center justify-center rounded-2xl ${active ? "bg-warning/10" : "bg-background"}`}
            accessibilityRole="button"
            accessibilityLabel={`${v} yıldız`}
            accessibilityState={{ selected: active }}
          >
            <Star size={22} color={active ? colors.warning : colors.mutedLight} fill={active ? colors.warning : "transparent"} />
          </Pressable>
        );
      })}
    </View>
  );
}

function commentError(comment: string) {
  const len = comment.trim().length;
  return len > 0 && len < 10 ? "Yorum en az 10 karakter olmalı." : undefined;
}

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  const query = useQuery({
    queryKey: ["business", id],
    queryFn: () => api.get<BusinessDetail>(`/businesses/${id}`, token),
    enabled: !!id,
  });
  const myReviewQuery = useQuery({
    queryKey: ["business", id, "my-review"],
    queryFn: () => api.get<MyReview | null>(`/businesses/${id}/reviews/me`, token),
    enabled: !!id && !!token,
  });

  const onReviewSaved = (message: string) => {
    void qc.invalidateQueries({ queryKey: ["business", id] });
    void qc.invalidateQueries({ queryKey: ["businesses"] });
    Alert.alert("Teşekkürler", message);
  };

  const reviewMut = useMutation({
    mutationFn: () =>
      api.post<MyReview>(
        `/businesses/${id}/reviews`,
        { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) },
        token,
      ),
    onSuccess: () => {
      setRating(0);
      setComment("");
      onReviewSaved("Yorumun iletildi. Moderasyon onayından sonra yayınlanacak.");
    },
    onError: (error) =>
      Alert.alert("Yorum gönderilemedi", error instanceof Error ? error.message : "Lütfen tekrar deneyin."),
  });

  const editMut = useMutation({
    mutationFn: () =>
      api.patch<MyReview>(
        `/businesses/${id}/reviews/me`,
        { rating: editRating, ...(editComment.trim() ? { comment: editComment.trim() } : {}) },
        token,
      ),
    onSuccess: () => {
      setEditing(false);
      onReviewSaved("Yorumun güncellendi. Onaydan sonra yayınlanacak.");
    },
    onError: (error) =>
      Alert.alert("Güncellenemedi", error instanceof Error ? error.message : "Lütfen tekrar deneyin."),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/businesses/${id}`, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
      router.back();
    },
    onError: (error) =>
      Alert.alert("Silinemedi", error instanceof ApiError ? error.message : "Lütfen tekrar deneyin."),
  });

  function confirmDeleteBusiness() {
    Alert.alert("İşletmeyi sil", "Bu işletmeyi silmek istediğine emin misin? Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMut.mutate() },
    ]);
  }

  if (query.isLoading) return <LoadingScreen />;
  if (!query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen title="İşletme" scroll={false}>
        {notFound ? (
          <EmptyState
            icon={Store}
            title="İşletme bulunamadı"
            subtitle="Bu işletme kaldırılmış veya henüz onaylanmamış olabilir."
            actionLabel="Rehbere dön"
            onAction={() => router.back()}
          />
        ) : (
          <ErrorState
            title="İşletme yüklenemedi"
            subtitle={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const data = query.data;
  const isOwner = !!user?.id && user.id === data.ownerId;
  const rating0 = Number(data.averageRating ?? 0);
  const reviews = data.reviews ?? [];
  const myReview = myReviewQuery.data ?? null;
  const pendingReview = myReview?.status === "PENDING" ? myReview : null;
  const canEdit = !!pendingReview && (pendingReview.editCount ?? 0) < 1;
  const canWrite = !!token && !myReviewQuery.isLoading && !myReview;
  const location = [data.address, data.city?.name].filter(Boolean).join(", ");
  const mapsUrl =
    data.latitude != null && data.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name}, ${location || data.city?.name || ""}`)}`;
  const whatsappDigits = data.whatsapp?.replace(/\D/g, "");
  const hasContact = Boolean(data.phone || whatsappDigits || data.website || data.address);

  const share = () =>
    void Share.share({
      title: data.name,
      message: `${data.name} – ${[data.category?.name, data.city?.name].filter(Boolean).join(", ")}\nhttps://turkexpatlar.de/rehber/${data.id}`,
    });

  return (
    <Screen
      title={data.name}
      subtitle={data.category?.name}
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
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => {
            void query.refetch();
            if (token) void myReviewQuery.refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Card>
        <View className="flex-row items-start gap-4">
          <IconTile icon={Store} size={56} />
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-text">{data.name}</Text>
            <View className="mt-1.5">
              <MetaItem icon={MapPin} label={[data.category?.name, data.city?.name, data.state?.name].filter(Boolean).join(" · ")} />
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <StarRating rating={rating0} />
          <Text className="text-sm font-semibold text-text">{rating0.toFixed(1)}</Text>
          <Text className="text-sm text-muted">({data.reviewCount ?? 0} yorum)</Text>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {data.isVerified ? <Badge label="Doğrulanmış işletme" icon={BadgeCheck} color="success" /> : null}
          {!data.isVerified && data.verificationStatus === "PENDING_REVIEW" ? (
            <Badge label="Doğrulama bekleniyor" icon={Clock} color="muted" />
          ) : null}
          {data.speaksTurkish ? <Badge label="Türkçe konuşuluyor" icon={Languages} color="primary" /> : null}
        </View>
        {data.description ? <Text className="mt-4 text-[15px] leading-6 text-text">{data.description}</Text> : null}
      </Card>

      {hasContact ? (
        <>
          <SectionLabel>İletişim</SectionLabel>
          <Card>
            {data.address ? <LinkRow icon={MapPin} label={location} url={mapsUrl} /> : null}
            {data.phone ? <LinkRow icon={Phone} label={data.phone} url={`tel:${data.phone.replace(/\s/g, "")}`} /> : null}
            {data.website ? <LinkRow icon={Globe} label={data.website} url={withProtocol(data.website)} emphasis /> : null}
            <View className="mt-3 flex-row flex-wrap gap-2">
              {data.phone ? (
                <Button
                  label="Ara"
                  icon={Phone}
                  className="flex-1"
                  onPress={() => void Linking.openURL(`tel:${data.phone!.replace(/\s/g, "")}`)}
                />
              ) : null}
              {whatsappDigits ? (
                <Button
                  label="WhatsApp"
                  icon={MessageCircle}
                  variant="soft"
                  className="flex-1"
                  onPress={() => void Linking.openURL(`https://wa.me/${whatsappDigits}`)}
                />
              ) : null}
              <Button
                label="Yol tarifi"
                icon={Navigation}
                variant="secondary"
                className="flex-1"
                onPress={() => void Linking.openURL(mapsUrl)}
              />
            </View>
          </Card>
        </>
      ) : null}

      <SectionLabel count={reviews.length}>Yorumlar</SectionLabel>

      {pendingReview && !editing ? (
        <Card className="mb-3 border-warning/40 bg-warning/5">
          <View className="flex-row items-center gap-2">
            <StarRating rating={pendingReview.rating} size={12} />
            <Text className="flex-1 text-sm font-semibold text-text">Senin yorumun</Text>
            <Badge label="Onay bekliyor" icon={Clock} color="warning" />
          </View>
          {pendingReview.comment ? <Text className="mt-2 text-sm leading-5 text-muted">{pendingReview.comment}</Text> : null}
          <Text className="mt-1 text-xs text-muted">{formatDate(pendingReview.createdAt)}</Text>
          {canEdit ? (
            <Button
              label="Düzelt"
              icon={Pencil}
              variant="ghost"
              size="sm"
              className="mt-2 self-start"
              onPress={() => {
                setEditRating(pendingReview.rating);
                setEditComment(pendingReview.comment ?? "");
                setEditing(true);
              }}
            />
          ) : null}
        </Card>
      ) : null}

      {pendingReview && editing ? (
        <Card className="mb-3">
          <Text className="text-[15px] font-bold text-text">Yorumunu düzelt</Text>
          <Text className="mt-0.5 text-xs text-muted">Yalnızca bir kez düzenleyebilirsin.</Text>
          <StarPicker value={editRating} onChange={setEditRating} />
          <TextField
            value={editComment}
            onChangeText={setEditComment}
            placeholder="Yorumun (isteğe bağlı, en az 10 karakter)"
            multiline
            maxLength={1000}
            error={commentError(editComment)}
          />
          <View className="flex-row gap-2">
            <Button
              label="Kaydet"
              className="flex-1"
              loading={editMut.isPending}
              disabled={!editRating || !!commentError(editComment)}
              onPress={() => editMut.mutate()}
            />
            <Button label="İptal" variant="secondary" className="flex-1" disabled={editMut.isPending} onPress={() => setEditing(false)} />
          </View>
        </Card>
      ) : null}

      {myReview?.status === "APPROVED" ? (
        <Text className="mb-3 text-xs text-muted">Bu işletmeye yorum yaptın. Teşekkürler!</Text>
      ) : null}
      {myReview?.status === "REJECTED" ? (
        <Text className="mb-3 text-xs text-danger">Önceki yorumun yayınlanmadı. Aşağıdan yeniden yazabilirsin.</Text>
      ) : null}

      {reviews.length === 0 && !pendingReview ? (
        <Card className="mb-3 items-center border-dashed">
          <Text className="py-2 text-center text-sm text-muted">Henüz yorum yok. İlk yorumu sen yaz.</Text>
        </Card>
      ) : (
        <View className="gap-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <View className="flex-row items-center gap-3">
                <Avatar name={r.user?.profile?.displayName ?? "?"} url={r.user?.profile?.avatarUrl} size="sm" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text">{r.user?.profile?.displayName ?? "Kullanıcı"}</Text>
                  <Text className="text-xs text-muted">{formatDate(r.createdAt)}</Text>
                </View>
                <StarRating rating={r.rating} size={12} />
              </View>
              {r.comment ? <Text className="mt-3 text-sm leading-5 text-text">{r.comment}</Text> : null}
            </Card>
          ))}
        </View>
      )}

      {canWrite || (token && myReview?.status === "REJECTED") ? (
        <>
          <SectionLabel>Deneyimini paylaş</SectionLabel>
          <Card>
            <Text className="text-sm text-muted">Yorumun yalnızca gerçek deneyimine dayanmalı.</Text>
            <StarPicker value={rating} onChange={setRating} />
            <TextField
              value={comment}
              onChangeText={setComment}
              placeholder="Yorumun (isteğe bağlı, en az 10 karakter)"
              multiline
              maxLength={1000}
              error={commentError(comment)}
            />
            <Button
              label={rating ? "Yorumu gönder" : "Önce puan seç"}
              icon={Send}
              loading={reviewMut.isPending}
              disabled={!rating || !!commentError(comment)}
              onPress={() => reviewMut.mutate()}
            />
          </Card>
        </>
      ) : null}

      {!token ? (
        <Card className="mt-6">
          <Text className="text-sm text-muted">Yorum yazmak için giriş yapmalısın.</Text>
          <Button label="Giriş yap" className="mt-3" onPress={() => router.push("/(auth)/giris" as never)} />
        </Card>
      ) : null}

      {isOwner ? (
        <View className="mt-6 gap-2">
          <SectionLabel>İşletmemi yönet</SectionLabel>
          <Button
            label="İşletmeyi sil"
            icon={Trash2}
            variant="danger"
            loading={deleteMut.isPending}
            onPress={confirmDeleteBusiness}
          />
        </View>
      ) : null}
    </Screen>
  );
}
