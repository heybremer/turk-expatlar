import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, LevelProgress } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LevelCard } from "@/components/ui/LevelCard";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";

type PublicUser = {
  id: string;
  role?: string;
  isBot?: boolean;
  editorTeam?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  levelProgress?: LevelProgress;
  reviewStats?: { averageRating: number; reviewCount: number };
  profile: {
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
  };
};

type Friendship =
  | { status: "SELF" | "NONE" }
  | { status: "FRIENDS" | "PENDING_SENT" | "PENDING_RECEIVED"; requestId: string };
type UserReviews = {
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    author: { id: string; displayName: string; avatarUrl?: string | null };
  }>;
  averageRating: number;
  reviewCount: number;
};

export default function PublicUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user: me } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);

  const profile = useQuery({
    queryKey: ["public-user", id],
    queryFn: () => api.get<PublicUser>(`/users/${id}/public`, token),
    enabled: !!id,
  });
  const friendship = useQuery({
    queryKey: ["friendship", id],
    queryFn: () => api.get<Friendship>(`/users/${id}/friendship-status`, token),
    enabled: !!id && !!token && me?.id !== id,
  });
  const reviews = useQuery({
    queryKey: ["user-reviews", id],
    queryFn: () => api.get<UserReviews>(`/users/${id}/reviews`, token),
    enabled: !!id,
  });
  const createReview = useMutation({
    mutationFn: () => api.post(`/users/${id}/reviews`, { rating }, token),
    onSuccess: () => {
      setRating(0);
      void client.invalidateQueries({ queryKey: ["user-reviews", id] });
      void client.invalidateQueries({ queryKey: ["public-user", id] });
      Alert.alert("Teşekkürler", "Değerlendirmen yayınlandı.");
    },
    onError: (error) =>
      Alert.alert(
        "Değerlendirme gönderilemedi",
        error instanceof ApiError ? error.message : "Tekrar deneyin.",
      ),
  });

  const report = useMutation({
    mutationFn: () =>
      api.post("/reports", { targetType: "USER", targetId: id, reason: "OTHER" }, token),
    onSuccess: () => Alert.alert("Teşekkürler", "Bildiriminiz incelemeye alındı."),
    onError: () => Alert.alert("Hata", "Bildirim gönderilemedi."),
  });

  async function updateFriendship() {
    if (!id || !friendship.data || busy) return;
    setBusy(true);
    try {
      if (friendship.data.status === "NONE") {
        await api.post(`/users/${id}/friend-request`, {}, token);
      } else if (friendship.data.status === "PENDING_RECEIVED") {
        await api.post(`/users/friend-requests/${friendship.data.requestId}/accept`, {}, token);
      } else if (friendship.data.status === "PENDING_SENT") {
        await api.delete(`/users/friend-requests/${friendship.data.requestId}`, token);
      } else if (friendship.data.status === "FRIENDS") {
        await api.delete(`/users/${id}/friend`, token);
      }
      await client.invalidateQueries({ queryKey: ["friendship", id] });
    } catch (error) {
      Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  if (profile.isLoading) return <LoadingScreen />;
  if (profile.isError || !profile.data) {
    return <ErrorState title="Kullanıcı bulunamadı" onRetry={() => void profile.refetch()} />;
  }

  const user = profile.data;
  const p = user.profile;
  const location = [p.city?.name, p.state?.name].filter(Boolean).join(", ");
  const friendLabel =
    friendship.data?.status === "FRIENDS"
      ? "Arkadaşsınız"
      : friendship.data?.status === "PENDING_SENT"
        ? "İsteği geri çek"
        : friendship.data?.status === "PENDING_RECEIVED"
          ? "İsteği kabul et"
          : "Arkadaş ekle";

  return (
    <Screen title="Kullanıcı profili" subtitle={location || "Türk Expatlar üyesi"}>
      <Card className="mb-5 items-center overflow-hidden border-primary/20 px-5 py-6">
        <View className="absolute left-0 right-0 top-0 h-20 bg-primary" />
        <View className="mt-7 rounded-full border-4 border-surface">
          <Avatar name={p.displayName} url={p.avatarUrl} size="lg" />
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <Text className="text-xl font-bold text-text">{p.displayName}</Text>
          {p.postalCountry && <Text>{p.postalCountry === "DE" ? "🇩🇪" : "🇹🇷"}</Text>}
        </View>
        {p.occupation && <Text className="mt-1 text-sm text-muted">{p.occupation}</Text>}
        <View className="mt-3 flex-row flex-wrap justify-center gap-2">
          {user.isBot && <Badge label="Otomatik hesap" color="primary" />}
          {user.role === "ADMIN" && <Badge label="Yönetici" color="warning" />}
          {location && p.city?.slug ? (
            <TouchableOpacity
              onPress={() => router.push(`/sehir/${p.city!.slug}` as never)}
            >
              <Badge label={location} color="muted" />
            </TouchableOpacity>
          ) : location ? (
            <Badge label={location} color="muted" />
          ) : null}
          {!!user.reviewStats?.reviewCount && (
            <Badge
              label={`★ ${user.reviewStats.averageRating.toFixed(1)} (${user.reviewStats.reviewCount})`}
              color="warning"
            />
          )}
        </View>

        {me?.id !== id && (
          <View className="mt-5 w-full flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Mesaj gönder"
                onPress={() => router.push(`/(tabs)/sohbet/dm-${id}` as never)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={friendLabel}
                variant="secondary"
                loading={busy}
                onPress={() => void updateFriendship()}
              />
            </View>
          </View>
        )}
      </Card>

      {user.levelProgress && (
        <View className="mb-5">
          <LevelCard levelProgress={user.levelProgress} />
        </View>
      )}

      <Card className="mb-5">
        <Text className="text-base font-bold text-text">Hakkında</Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          {p.bio || "Kullanıcı henüz kendisi hakkında bilgi eklememiş."}
        </Text>
        {!!p.interests?.length && (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {p.interests.map((interest) => (
              <Badge key={interest} label={interest} color="muted" />
            ))}
          </View>
        )}
        {!!p.languages?.length && (
          <View className="mt-4 flex-row items-center gap-2">
            <Ionicons name="language-outline" size={18} color="#6b7280" />
            <Text className="text-sm text-muted">{p.languages.join(", ").toUpperCase()}</Text>
          </View>
        )}
      </Card>

      <Card>
        <InfoRow
          icon="calendar-outline"
          label="Üyelik tarihi"
          value={new Date(user.createdAt).toLocaleDateString("tr-TR")}
        />
        <InfoRow
          icon="time-outline"
          label="Son giriş"
          value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR") : "Bilinmiyor"}
        />
      </Card>

      {me?.id !== id && (
        <Card className="mt-5">
          <Text className="font-bold text-text">Bu üyeyi değerlendir</Text>
          <View className="mt-3 flex-row gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setRating(value)}
                className="h-11 w-11 items-center justify-center rounded-xl bg-background"
                accessibilityLabel={`${value} yıldız`}
              >
                <Ionicons
                  name={value <= rating ? "star" : "star-outline"}
                  size={24}
                  color={value <= rating ? "#d97706" : "#9ca3af"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Button
            label="Değerlendirmeyi gönder"
            disabled={!rating}
            loading={createReview.isPending}
            onPress={() => createReview.mutate()}
          />
        </Card>
      )}

      {!!reviews.data?.reviews.length && (
        <View className="mt-5 gap-3">
          <Text className="text-base font-bold text-text">
            Değerlendirmeler ({reviews.data.reviewCount})
          </Text>
          {reviews.data.reviews.map((review) => (
            <Card key={review.id}>
              <View className="flex-row items-center gap-3">
                <Avatar
                  name={review.author.displayName}
                  url={review.author.avatarUrl}
                  size="sm"
                />
                <View className="flex-1">
                  <Text className="font-semibold text-text">
                    {review.author.displayName}
                  </Text>
                  <Text className="text-xs text-muted">
                    {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
                <Text className="font-bold text-warning">★ {review.rating}</Text>
              </View>
              {review.comment ? (
                <Text className="mt-3 text-sm leading-5 text-muted">
                  {review.comment}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {me?.id !== id && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Kullanıcıyı bildir", "Bu profili yönetime bildirmek istiyor musunuz?", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Bildir", style: "destructive", onPress: () => report.mutate() },
            ])
          }
          className="mt-6 min-h-11 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="flag-outline" size={17} color="#dc2626" />
          <Text className="font-semibold text-danger">Kullanıcıyı bildir</Text>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="min-h-12 flex-row items-center gap-3 border-b border-border py-2">
      <Ionicons name={icon} size={19} color="#6b7280" />
      <Text className="flex-1 text-sm text-muted">{label}</Text>
      <Text className="text-sm font-semibold text-text">{value}</Text>
    </View>
  );
}
