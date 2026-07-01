import { useState } from "react";
import { Alert, RefreshControl, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@/lib/auth";
import { api, MySubscription, ReferralInfo, UserStats } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AppHeader } from "@/components/navigation/AppHeader";
import { COUNTRY_FLAG, formatDate } from "@/lib/utils";

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = { icon: IconName; label: string; onPress: () => void; danger?: boolean; badge?: string };

const PLAN_LABELS: Record<string, string> = {
  USER_YEARLY: "Kullanıcı Planı",
  BUSINESS_YEARLY: "İşletme Planı",
  FREE_PROMO: "Promosyon Üyeliği",
};

export default function ProfilScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const {
    data: stats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["me-stats"],
    queryFn: () => api.get<UserStats>("/users/me/stats", token),
    enabled: !!token,
  });

  const { data: subscription, refetch: refetchSub } = useQuery({
    queryKey: ["me-subscription"],
    queryFn: () => api.get<MySubscription>("/subscriptions/me", token),
    enabled: !!token,
  });

  const { data: referrals, refetch: refetchReferrals, isFetching: refreshingReferrals } = useQuery({
    queryKey: ["me-referrals"],
    queryFn: () => api.get<ReferralInfo>("/users/me/referrals", token),
    enabled: !!token,
  });

  async function onRefresh() {
    await Promise.all([refetchStats(), refetchSub(), refetchReferrals(), qc.invalidateQueries({ queryKey: ["me-stats"] })]);
  }

  async function copyReferralCode() {
    if (!referrals?.referralCode) return;
    await Clipboard.setStringAsync(referrals.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareReferralLink() {
    if (!referrals?.referralCode) return;
    const link = `https://turkexpatlar.de/kayit?ref=${referrals.referralCode}`;
    try {
      await Share.share({
        message: `Türk Expatlar'a katıl — Almanya'daki Türkçe topluluk platformu. Davet kodum: ${referrals.referralCode}\n${link}`,
      });
    } catch {
      // ignore
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Hesabı Sil",
      "Hesabınızı silmek istediğinize eminmisiniz? Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabımı Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/users/me", token);
              await logout();
            } catch {
              Alert.alert("Hata", "Hesap silinemedi, lütfen tekrar deneyin");
            }
          },
        },
      ],
    );
  }

  if (!user) return <LoadingScreen />;

  const profile = user.profile;
  const name = profile?.displayName ?? user.email;
  const country = profile?.postalCountry;
  const isPremium = !!subscription?.isActive;
  const planLabel = subscription?.plan ? PLAN_LABELS[subscription.plan] ?? subscription.plan : null;

  const menuItems: MenuItem[] = [
    { icon: "create-outline", label: "Profili Düzenle", onPress: () => router.push("/(tabs)/profil/duzenle") },
    { icon: "gift-outline", label: "Referanslarım", onPress: () => router.push("/(tabs)/profil/referanslar"), badge: referrals?.referralCount ? String(referrals.referralCount) : undefined },
    { icon: "chatbubbles-outline", label: "Forum Konularım", onPress: () => router.push("/(tabs)/forum") },
    { icon: "chatbox-ellipses-outline", label: "Mesajlarım", onPress: () => router.push("/(tabs)/sohbet") },
    { icon: "notifications-outline", label: "Bildirimler", onPress: () => router.push("/(tabs)/profil/bildirimler") },
    { icon: "lock-closed-outline", label: "Şifre Değiştir", onPress: () => router.push("/(tabs)/profil/sifre") },
    { icon: "ban-outline", label: "Engellenen Kullanıcılar", onPress: () => router.push("/(tabs)/profil/engellenenler") },
    { icon: "apps-outline", label: "Mini Uygulamalar", onPress: () => router.push("/uygulamalar") },
    { icon: "trash-outline", label: "Hesabımı Sil", onPress: confirmDeleteAccount, danger: true },
    { icon: "log-out-outline", label: "Çıkış Yap", onPress: () => void logout(), danger: true },
  ];

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Profilim" subtitle="Hesap, bildirim ve ayarlar" />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshingReferrals} onRefresh={() => void onRefresh()} tintColor="#1a56db" />}
      >
        {/* Profil kartı */}
        <Card className="overflow-hidden p-0">
          <View className="h-20 bg-primary" />
          <View className="-mt-10 items-center px-4 pb-6">
          <Avatar name={name} url={profile?.avatarUrl} size="xl" />
          <View className="mt-4 items-center">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-text">{name}</Text>
              {country && <Text className="text-lg">{COUNTRY_FLAG[country]}</Text>}
            </View>
            <Text className="text-sm text-muted mt-1">{user.email}</Text>
            {profile?.state && (
              <View className="mt-1 flex-row items-center gap-1">
                <Ionicons name="location-outline" size={13} color="#6b7280" />
                <Text className="text-sm text-muted">{profile.city?.name ?? ""}{profile.city ? ", " : ""}{profile.state.name}</Text>
              </View>
            )}
            <View className="flex-row flex-wrap justify-center gap-2 mt-3">
              <Badge label={user.role === "ADMIN" ? "Admin" : user.role === "MODERATOR" ? "Moderatör" : "Üye"} color={user.role === "ADMIN" ? "danger" : user.role === "MODERATOR" ? "warning" : "primary"} />
              {isPremium && <Badge label={`✨ ${planLabel ?? "Premium"}`} color="success" />}
              {!user.emailVerified && <Badge label="Email doğrulanmamış" color="warning" />}
            </View>
            {profile?.occupation && (
              <Text className="text-sm text-text mt-3 font-medium">{profile.occupation}</Text>
            )}
            {profile?.bio && (
              <Text className="text-sm text-muted mt-1 text-center leading-5">{profile.bio}</Text>
            )}
            {!!profile?.languages?.length && (
              <View className="flex-row flex-wrap justify-center gap-1.5 mt-3">
                {profile.languages.map((lang) => (
                  <View key={lang} className="rounded-full bg-background px-2.5 py-1">
                    <Text className="text-xs text-muted">{lang}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* İstatistikler */}
          {stats && (
            <View className="mt-5 w-full flex-row justify-around rounded-2xl bg-background px-2 py-4">
              {[
                { label: "Konu", value: stats.topicCount },
                { label: "Cevap", value: stats.replyCount },
                { label: "Etkinlik", value: stats.eventCount },
              ].map(({ label, value }) => (
                <View key={label} className="items-center">
                  <Text className="text-xl font-bold text-text">{value}</Text>
                  <Text className="text-xs text-muted">{label}</Text>
                </View>
              ))}
            </View>
          )}
          </View>
        </Card>

        {/* Üyelik kartı */}
        {isPremium && subscription?.subscription && (
          <Card>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Ionicons name="sparkles" size={18} color="#15803d" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text">{planLabel}</Text>
                {subscription.subscription.expiresAt && (
                  <Text className="text-xs text-muted mt-0.5">
                    Bitiş: {formatDate(subscription.subscription.expiresAt)}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Referans kartı */}
        {referrals?.referralCode && (
          <Card>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="gift-outline" size={16} color="#1a56db" />
              <Text className="text-sm font-semibold text-primary">Arkadaşını davet et</Text>
            </View>
            <Text className="text-xs text-muted mt-1">
              Kodunla kayıt olanlar senin referansın olur. Toplam: <Text className="font-semibold text-text">{referrals.referralCount}</Text> kişi
            </Text>
            <Text className="mt-2 font-mono text-2xl font-bold tracking-wider text-primary">{referrals.referralCode}</Text>
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity onPress={() => void copyReferralCode()} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5">
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color="#1a56db" />
                <Text className="text-sm font-medium text-primary">{copied ? "Kopyalandı" : "Kodu Kopyala"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void shareReferralLink()} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5">
                <Ionicons name="share-social-outline" size={15} color="#1a56db" />
                <Text className="text-sm font-medium text-primary">Paylaş</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Menü */}
        <Card className="p-0 overflow-hidden">
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center gap-3 px-4 py-4 ${i < menuItems.length - 1 ? "border-b border-border" : ""}`}
            >
              <View className={`h-9 w-9 items-center justify-center rounded-xl ${item.danger ? "bg-danger/10" : "bg-background"}`}>
                <Ionicons name={item.icon} size={18} color={item.danger ? "#dc2626" : "#1a56db"} />
              </View>
              <Text className={`flex-1 text-sm font-medium ${item.danger ? "text-danger" : "text-text"}`}>{item.label}</Text>
              {item.badge && (
                <View className="rounded-full bg-primary/10 px-2 py-0.5 mr-1">
                  <Text className="text-xs font-semibold text-primary">{item.badge}</Text>
                </View>
              )}
              {!item.danger && <Ionicons name="chevron-forward" size={16} color="#6b7280" />}
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
