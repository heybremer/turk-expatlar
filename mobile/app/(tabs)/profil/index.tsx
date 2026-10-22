import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Crown,
  FileText,
  Gift,
  Info,
  LayoutGrid,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MailWarning,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Plane,
  Share2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, AuthUser } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { LevelCard } from "@/components/ui/LevelCard";
import { ListGroup, ListRow, SectionLabel } from "@/components/ui/kit";
import { AppHeader } from "@/components/navigation/AppHeader";
import { COUNTRY_FLAG } from "@/lib/utils";

type MySubscription = {
  plan: "USER_YEARLY" | "BUSINESS_YEARLY" | "FREE_PROMO" | null;
  isActive: boolean;
  subscription?: { expiresAt?: string | null; promoCode?: { code: string } | null } | null;
};
type ReferralInfo = {
  referralCode: string | null;
  referralCount: number;
  referredBy?: { id: string; profile?: { displayName: string } | null } | null;
};
type Friend = { id: string };
type IncomingRequest = { id: string };

const PLAN_LABELS: Record<string, string> = {
  USER_YEARLY: "Kullanıcı planı",
  BUSINESS_YEARLY: "İşletme planı",
  FREE_PROMO: "Promosyon üyeliği",
};
const WEB_URL = "https://turkexpatlar.de";

export default function ProfilScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const go = (route: string) => router.push(route as never);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const fresh = await api.get<AuthUser>("/users/me", token);
      refreshUser(fresh);
      return fresh;
    },
    enabled: !!token,
  });
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<MySubscription>("/subscriptions/me", token),
    enabled: !!token,
  });
  const { data: referrals } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => api.get<ReferralInfo>("/users/me/referrals", token),
    enabled: !!token,
  });
  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<Friend[]>("/users/friends", token),
    enabled: !!token,
  });
  const { data: incoming } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => api.get<IncomingRequest[]>("/users/friend-requests/incoming", token),
    enabled: !!token,
  });

  useFocusEffect(
    useCallback(() => {
      if (token) void me.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      me.refetch(),
      qc.invalidateQueries({ queryKey: ["subscription"] }),
      qc.invalidateQueries({ queryKey: ["referrals"] }),
      qc.invalidateQueries({ queryKey: ["friends"] }),
      qc.invalidateQueries({ queryKey: ["friend-requests"] }),
    ]).catch(() => {});
    setRefreshing(false);
  };

  if (!user) return <LoadingScreen />;

  const profile = user.profile;
  const name = profile?.displayName ?? user.email;
  const country = profile?.postalCountry;
  const location = [profile?.city?.name, profile?.state?.name].filter(Boolean).join(", ");
  const active = !!subscription?.isActive;
  const planLabel = subscription?.plan ? PLAN_LABELS[subscription.plan] ?? subscription.plan : null;
  const membershipLabel = active ? planLabel ?? "Premium üye" : "Ücretsiz üye";
  const expiresAt = subscription?.subscription?.expiresAt;
  const referralLink = referrals?.referralCode ? `${WEB_URL}/kayit?ref=${referrals.referralCode}` : null;
  const incomingCount = incoming?.length ?? 0;

  const completionSteps = [
    { key: "avatar", label: "Profil fotoğrafı ekle", done: !!profile?.avatarUrl, route: "/(tabs)/profil/duzenle" },
    { key: "city", label: "Şehir bilgisi ekle", done: !!profile?.cityId, route: "/(tabs)/profil/duzenle" },
    {
      key: "interests",
      label: "İlgi alanlarını belirle",
      done: (profile?.interests?.length ?? 0) > 0,
      route: "/(tabs)/profil/duzenle",
    },
    { key: "email", label: "E-posta adresini doğrula", done: !!user.emailVerified, route: "/email-dogrula" },
  ];
  const completed = completionSteps.filter((s) => s.done).length;
  const completionPercent = Math.round((completed / completionSteps.length) * 100);

  const copyReferral = async () => {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (!referralLink || !referrals?.referralCode) return;
    void Share.share({
      message: `Türk Expatlar'a katıl — Almanya'daki Türkçe topluluk platformu. Davet kodum: ${referrals.referralCode}\n${referralLink}`,
    });
  };

  const confirmLogout = () =>
    Alert.alert("Çıkış yap", "Hesabından çıkış yapmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: () => void logout() },
    ]);

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Profilim" subtitle="Hesap, bildirim ve ayarlar" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
        }
      >
        <Card className="overflow-hidden" padded={false}>
          <View className="h-24 overflow-hidden bg-primary-950">
            <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
          </View>
          <View className="-mt-10 items-center px-4 pb-5">
            <View className="rounded-full border-4 border-surface">
              <Avatar name={name} url={profile?.avatarUrl} size="xl" />
            </View>
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="shrink text-xl font-extrabold text-text" numberOfLines={1}>
                {name}
              </Text>
              {country && COUNTRY_FLAG[country] ? <Text className="text-lg">{COUNTRY_FLAG[country]}</Text> : null}
            </View>
            <Text className="mt-0.5 text-sm text-muted">{user.email}</Text>
            {profile?.occupation ? (
              <View className="mt-1.5 flex-row items-center gap-1">
                <Briefcase size={13} color={colors.muted} />
                <Text className="text-sm text-muted">{profile.occupation}</Text>
              </View>
            ) : null}
            {location ? (
              <View className="mt-1.5 flex-row items-center gap-1">
                <MapPin size={13} color={colors.muted} />
                <Text className="text-sm text-muted">{location}</Text>
              </View>
            ) : null}
            <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
              <Badge
                label={user.role === "ADMIN" ? "Admin" : user.role === "MODERATOR" ? "Moderatör" : "Üye"}
                color={user.role === "ADMIN" ? "danger" : user.role === "MODERATOR" ? "warning" : "primary"}
              />
              <Badge label={membershipLabel} color={active ? "success" : "muted"} icon={Crown} />
              {user.levelProgress ? <LevelCard levelProgress={user.levelProgress} compact /> : null}
            </View>
            <View className="mt-4 w-full flex-row gap-2">
              <Button
                label="Düzenle"
                icon={Pencil}
                variant="secondary"
                size="sm"
                className="flex-1"
                onPress={() => go("/(tabs)/profil/duzenle")}
              />
              <Button
                label="Profilimi gör"
                icon={UserRound}
                variant="soft"
                size="sm"
                className="flex-1"
                onPress={() => go(`/kullanici/${user.id}`)}
              />
            </View>
          </View>

          {user.levelProgress ? (
            <View className="border-t border-border p-4">
              <LevelCard levelProgress={user.levelProgress} />
              <Text className="mt-2 text-xs leading-4 text-muted">
                Forum konusu açarak (+5), cevap yazarak (+3), etkinlik oluşturarak (+10) ve etkinliklere
                katılarak (+5) puan kazanırsın.
              </Text>
            </View>
          ) : null}
        </Card>

        {!user.emailVerified ? (
          <Pressable
            onPress={() => go("/email-dogrula")}
            accessibilityRole="button"
            accessibilityLabel="E-posta adresini doğrula"
            className="mt-4 min-h-14 flex-row items-center gap-3 rounded-3xl border border-warning/30 bg-warning/5 p-4 active:opacity-70"
          >
            <MailWarning size={20} color={colors.warning} />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-text">E-posta adresin doğrulanmadı</Text>
              <Text className="mt-0.5 text-xs text-muted">Doğrulama bağlantısını tekrar göndermek için dokun.</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedLight} />
          </Pressable>
        ) : null}

        {completionPercent < 100 ? (
          <Card className="mt-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[15px] font-bold text-text">Profil tamamlanma</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {completed}/{completionSteps.length} adım tamamlandı
                </Text>
              </View>
              <Text className="text-2xl font-extrabold text-primary">{completionPercent}%</Text>
            </View>
            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
              <View className="h-full rounded-full bg-primary" style={{ width: `${completionPercent}%` }} />
            </View>
            <View className="mt-3">
              {completionSteps.map((step) => (
                <Pressable
                  key={step.key}
                  onPress={() => go(step.route)}
                  disabled={step.done}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: step.done }}
                  accessibilityLabel={step.label}
                  className="min-h-11 flex-row items-center gap-2.5 active:opacity-60"
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full ${
                      step.done ? "bg-success/15" : "bg-border"
                    }`}
                  >
                    {step.done ? (
                      <Check size={12} color={colors.success} strokeWidth={3} />
                    ) : (
                      <ChevronRight size={12} color={colors.muted} />
                    )}
                  </View>
                  <Text className={`text-sm ${step.done ? "text-muted line-through" : "text-text"}`}>
                    {step.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <SectionLabel>Üyelik</SectionLabel>
        <Card onPress={() => go("/uyelik")}>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Crown size={20} color={colors.warning} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-text">{membershipLabel}</Text>
              <Text className="mt-0.5 text-xs text-muted">
                {active
                  ? [
                      expiresAt ? `Bitiş: ${new Date(expiresAt).toLocaleDateString("tr-TR")}` : null,
                      subscription?.subscription?.promoCode?.code
                        ? `Kod: ${subscription.subscription.promoCode.code}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Aktif üyelik"
                  : "Planlara göz at ve topluluğa destek ol"}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.mutedLight} />
          </View>
        </Card>

        {referrals?.referralCode ? (
          <>
            <SectionLabel>Arkadaşını davet et</SectionLabel>
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Gift size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-muted">Davet kodun</Text>
                  <Text className="text-xl font-extrabold tracking-wider text-primary" selectable>
                    {referrals.referralCode}
                  </Text>
                </View>
              </View>
              <Text className="mt-3 text-sm text-muted">
                Kodunla kayıt olanlar senin referansın olur. Toplam:{" "}
                <Text className="font-bold text-text">{referrals.referralCount ?? 0}</Text> kişi
              </Text>
              {referrals.referredBy?.profile?.displayName ? (
                <Text className="mt-1 text-sm text-muted">
                  Seni davet eden:{" "}
                  <Text className="font-semibold text-text">{referrals.referredBy.profile.displayName}</Text>
                </Text>
              ) : null}
              <View className="mt-4 flex-row gap-2">
                <Button
                  label={copied ? "Kopyalandı" : "Linki kopyala"}
                  icon={copied ? Check : Copy}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onPress={() => void copyReferral()}
                />
                <Button label="Paylaş" icon={Share2} size="sm" className="flex-1" onPress={shareReferral} />
              </View>
            </Card>
          </>
        ) : null}

        <SectionLabel>Hesap</SectionLabel>
        <ListGroup>
          <ListRow
            first
            icon={Pencil}
            title="Profili düzenle"
            subtitle="Ad, fotoğraf, konum ve ilgi alanları"
            onPress={() => go("/(tabs)/profil/duzenle")}
          />
          <ListRow icon={Bell} tint={colors.accent} title="Bildirimler" onPress={() => go("/(tabs)/profil/bildirimler")} />
          <ListRow
            icon={Users}
            title="Arkadaşlar"
            subtitle={
              incomingCount > 0
                ? `${friends?.length ?? 0} arkadaş · ${incomingCount} yeni istek`
                : `${friends?.length ?? 0} arkadaş`
            }
            onPress={() => go("/arkadaslar")}
            right={
              incomingCount > 0 ? (
                <View className="h-6 min-w-[24px] items-center justify-center rounded-full bg-danger px-1.5">
                  <Text className="text-xs font-bold text-white">{incomingCount > 9 ? "9+" : incomingCount}</Text>
                </View>
              ) : undefined
            }
          />
        </ListGroup>

        <SectionLabel>Aktiviteler</SectionLabel>
        <ListGroup>
          <ListRow first icon={MessagesSquare} title="Forum" onPress={() => go("/(tabs)/forum")} />
          <ListRow icon={CalendarDays} tint={colors.accent} title="Etkinlikler" onPress={() => go("/(tabs)/etkinlikler")} />
          <ListRow icon={Briefcase} tint={colors.primaryDark} title="İş ilanları" onPress={() => go("/isler")} />
          <ListRow icon={Plane} tint={colors.success} title="Seyahat ve taşıma" onPress={() => go("/seyahat")} />
          <ListRow icon={MessageCircle} title="Mesajlarım" onPress={() => go("/(tabs)/sohbet")} />
          <ListRow icon={LayoutGrid} tint={colors.muted} title="Mini uygulamalar" onPress={() => go("/uygulamalar")} />
        </ListGroup>

        <SectionLabel>Güvenlik</SectionLabel>
        <ListGroup>
          <ListRow first icon={Lock} title="Şifre değiştir" onPress={() => go("/(tabs)/profil/sifre")} />
          <ListRow
            icon={ShieldCheck}
            tint={colors.success}
            title="İki aşamalı doğrulama"
            subtitle={user.twoFactorEnabled ? "Açık" : "Kapalı"}
            onPress={() => go("/iki-asamali-dogrulama")}
          />
          <ListRow
            icon={UserRound}
            tint={colors.muted}
            title="Hesap ve gizlilik"
            subtitle="Engellenenler ve hesap silme"
            onPress={() => go("/hesap")}
          />
        </ListGroup>

        <SectionLabel>Destek ve bilgi</SectionLabel>
        <ListGroup>
          <ListRow first icon={LifeBuoy} title="Destek" subtitle="Sorun, öneri ve istekler" onPress={() => go("/destek")} />
          <ListRow icon={Info} tint={colors.muted} title="Hakkımızda" onPress={() => go("/bilgi/hakkinda")} />
          <ListRow icon={ShieldCheck} tint={colors.muted} title="Gizlilik" onPress={() => go("/bilgi/gizlilik")} />
          <ListRow icon={BookOpen} tint={colors.muted} title="Kullanım koşulları" onPress={() => go("/bilgi/kullanim")} />
          <ListRow icon={FileText} tint={colors.muted} title="Impressum" onPress={() => go("/bilgi/impressum")} />
          <ListRow icon={Mail} tint={colors.muted} title="İletişim" onPress={() => go("/bilgi/iletisim")} />
        </ListGroup>

        <ListGroup className="mt-6">
          <ListRow first icon={LogOut} title="Çıkış yap" destructive onPress={confirmLogout} />
        </ListGroup>
      </ScrollView>
    </View>
  );
}
