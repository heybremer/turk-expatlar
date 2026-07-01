import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AppHeader } from "@/components/navigation/AppHeader";
import { COUNTRY_FLAG } from "@/lib/utils";

type IconName = keyof typeof Ionicons.glyphMap;
type UserStats = { topicCount: number; replyCount: number; eventCount: number };

type MenuItem = { icon: IconName; label: string; onPress: () => void; danger?: boolean };

export default function ProfilScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const { data: stats } = useQuery({
    queryKey: ["me-stats"],
    queryFn: () => api.get<UserStats>("/users/me/stats", token),
    enabled: !!token,
  });

  if (!user) return <LoadingScreen />;

  const profile = user.profile;
  const name = profile?.displayName ?? user.email;
  const country = profile?.postalCountry;

  const menuItems: MenuItem[] = [
    { icon: "create-outline", label: "Profili Düzenle", onPress: () => router.push("/(tabs)/profil/duzenle") },
    { icon: "chatbubbles-outline", label: "Forum Konularım", onPress: () => router.push("/(tabs)/forum") },
    { icon: "chatbox-ellipses-outline", label: "Mesajlarım", onPress: () => router.push("/(tabs)/sohbet") },
    { icon: "notifications-outline", label: "Bildirimler", onPress: () => router.push("/(tabs)/profil/bildirimler") },
    { icon: "lock-closed-outline", label: "Şifre Değiştir", onPress: () => router.push("/(tabs)/profil/sifre") },
    { icon: "apps-outline", label: "Mini Uygulamalar", onPress: () => router.push("/uygulamalar") },
    { icon: "log-out-outline", label: "Çıkış Yap", onPress: () => void logout(), danger: true },
  ];

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Profilim" subtitle="Hesap, bildirim ve ayarlar" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
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
            <View className="flex-row gap-2 mt-3">
              <Badge label={user.role === "ADMIN" ? "Admin" : user.role === "MODERATOR" ? "Moderatör" : "Üye"} color={user.role === "ADMIN" ? "danger" : user.role === "MODERATOR" ? "warning" : "primary"} />
              {!user.emailVerified && <Badge label="Email doğrulanmamış" color="warning" />}
            </View>
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
              {!item.danger && <Ionicons name="chevron-forward" size={16} color="#6b7280" />}
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
