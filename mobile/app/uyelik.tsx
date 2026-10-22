import { useEffect, useState } from "react";
import { Alert, AppState, Linking, RefreshControl, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  CircleCheck,
  Crown,
  Gift,
  Info,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { TextField } from "@/components/ui/TextField";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, IconTile, SectionLabel } from "@/components/ui/kit";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

type Plan = "USER_YEARLY" | "BUSINESS_YEARLY";
type Subscription = {
  plan: Plan | "FREE_PROMO";
  status?: string;
  expiresAt?: string | null;
  promoCode?: { code: string; label?: string | null } | null;
};
type MySubscription = {
  subscription: Subscription | null;
  plan: Subscription["plan"] | null;
  status?: string | null;
  isActive: boolean;
};
type LaunchPromo = { code: string; remaining: number; maxUses: number; available: boolean };

const PLAN_NAMES: Record<Subscription["plan"], string> = {
  USER_YEARLY: "Kullanıcı",
  BUSINESS_YEARLY: "İşletme",
  FREE_PROMO: "Promosyon",
};

const plans: Array<{
  id: Plan;
  name: string;
  price: string;
  icon: LucideIcon;
  features: string[];
}> = [
  {
    id: "USER_YEARLY",
    name: "Kullanıcı",
    price: "10 € / yıl",
    icon: UserRound,
    features: [
      "Forum'da sınırsız konu ve yanıt",
      "Etkinliklere katılım ve takvime ekleme",
      "Şehir ve eyalet sayfaları",
      "İşletme rehberi ve iş ilanları",
      "Seyahat eşya taşıma talepleri",
    ],
  },
  {
    id: "BUSINESS_YEARLY",
    name: "İşletme",
    price: "50 € / yıl",
    icon: Building2,
    features: [
      "Kullanıcı planındaki her şey",
      "İşletme rehberinde premium konum",
      "Doğrulanmış işletme rozeti",
      "Ayda 1 'Öne Çıkan' reklam postu",
      "İş ilanlarında Türkçe işveren rozeti",
    ],
  },
];

const FREE_FEATURES = ["Forum okuma ve yanıt", "Etkinlikleri görüntüleme", "İş ilanlarına bakma", "Seyahat taleplerini inceleme"];

export default function MembershipScreen() {
  const token = useAuth((state) => state.token);
  const qc = useQueryClient();
  const [promo, setPromo] = useState("");
  const [promoPlan, setPromoPlan] = useState<Plan>("USER_YEARLY");
  const [loading, setLoading] = useState<Plan | "promo" | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<MySubscription>("/subscriptions/me", token),
    enabled: !!token,
  });
  const launch = useQuery({
    queryKey: ["launch-promo"],
    queryFn: () => api.get<LaunchPromo>("/subscriptions/promo/launch"),
    staleTime: 5 * 60 * 1000,
  });

  // Stripe ödemesi tarayıcıda tamamlanır; uygulamaya dönünce durumu tazele
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void qc.invalidateQueries({ queryKey: ["subscription"] });
    });
    return () => sub.remove();
  }, [qc]);

  const checkout = async (plan: Plan) => {
    if (loading) return;
    setLoading(plan);
    try {
      const response = await api.post<{ url: string | null; message?: string }>(
        "/subscriptions/checkout",
        { plan },
        token,
      );
      if (response.url) await Linking.openURL(response.url);
      else Alert.alert("Bilgi", response.message ?? "Ödeme şu anda kullanılamıyor.");
    } catch (err) {
      Alert.alert("Ödeme başlatılamadı", err instanceof ApiError ? err.message : "Tekrar deneyin.");
    } finally {
      setLoading(null);
    }
  };

  const promoCode = promo.trim().toUpperCase();
  const promoError = promo.length > 0 && (promoCode.length < 3 || promoCode.length > 32) ? "Kod 3-32 karakter olmalı" : null;

  const applyPromo = async () => {
    if (!promoCode || promoError || loading) return;
    setLoading("promo");
    setMessage(null);
    try {
      const response = await api.post<{ message: string }>(
        "/subscriptions/promo",
        { code: promoCode, plan: promoPlan },
        token,
      );
      setMessage({ text: response.message ?? "Kod uygulandı.", ok: true });
      setPromo("");
      void qc.invalidateQueries({ queryKey: ["subscription"] });
      void qc.invalidateQueries({ queryKey: ["launch-promo"] });
    } catch (err) {
      setMessage({ text: err instanceof ApiError ? err.message : "Kod uygulanamadı.", ok: false });
    } finally {
      setLoading(null);
    }
  };

  const data = subscription.data;
  const active = !!data?.isActive;
  const expiresAt = data?.subscription?.expiresAt;

  return (
    <Screen
      title="Üyelik"
      subtitle="Planını ve avantajlarını yönet"
      keyboardAware
      refreshControl={
        <RefreshControl
          refreshing={subscription.isRefetching && !subscription.isLoading}
          onRefresh={() => {
            void subscription.refetch();
            void launch.refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {subscription.isLoading ? (
        <View className="-m-4">
          <SkeletonList count={2} />
        </View>
      ) : subscription.isError ? (
        <ErrorState
          title="Üyelik bilgisi yüklenemedi"
          subtitle={subscription.error instanceof ApiError ? subscription.error.message : undefined}
          onRetry={() => void subscription.refetch()}
        />
      ) : (
        <>
          <View className="overflow-hidden rounded-3xl bg-primary-950 p-6">
            <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <Crown size={22} color={colors.white} />
            </View>
            {active ? (
              <>
                <Text className="mt-4 text-2xl font-extrabold text-white">
                  {data?.plan ? PLAN_NAMES[data.plan] ?? "Premium" : "Premium"} planı aktif
                </Text>
                {expiresAt ? (
                  <Text className="mt-1 text-sm text-primary-100">
                    Bitiş: {new Date(expiresAt).toLocaleDateString("tr-TR")}
                  </Text>
                ) : null}
                {data?.subscription?.promoCode?.code ? (
                  <Text className="mt-1 text-sm text-primary-100">Kod: {data.subscription.promoCode.code}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text className="mt-4 text-2xl font-extrabold text-white">Topluluğa destek ol</Text>
                <Text className="mt-1 text-sm leading-5 text-primary-100">
                  Yıllık üyelikle tüm özelliklerin kilidini aç.
                </Text>
                {data?.status === "EXPIRED" || (data?.subscription && !active) ? (
                  <Text className="mt-2 text-xs font-semibold text-primary-100">Önceki üyeliğinin süresi doldu.</Text>
                ) : null}
              </>
            )}
          </View>

          {!active && launch.data?.available ? (
            <Card className="mt-4 flex-row items-center gap-3 border-success/30 bg-success/5">
              <IconTile icon={Gift} tint={colors.success} size={40} />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-text">Lansman kampanyası</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {launch.data.code} koduyla 1 yıl ücretsiz · {launch.data.remaining} kişilik yer kaldı
                </Text>
              </View>
              <Button
                label="Kullan"
                size="sm"
                variant="soft"
                onPress={() => setPromo(launch.data!.code)}
                accessibilityLabel={`${launch.data.code} kodunu promosyon alanına yaz`}
              />
            </Card>
          ) : null}

          <SectionLabel>Planlar</SectionLabel>
          <View className="gap-4">
            {!active ? (
              <Card className="p-5">
                <Text className="text-lg font-extrabold text-text">Ücretsiz</Text>
                <Text className="text-[15px] font-bold text-muted">0 €</Text>
                <View className="mt-4 gap-2.5">
                  {FREE_FEATURES.map((feature) => (
                    <View key={feature} className="flex-row items-center gap-2.5">
                      <View className="h-5 w-5 items-center justify-center rounded-full bg-background">
                        <Check size={12} color={colors.muted} strokeWidth={3} />
                      </View>
                      <Text className="flex-1 text-sm text-muted">{feature}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}
            {plans.map((plan) => {
              const current = active && data?.plan === plan.id;
              return (
                <Card key={plan.id} className={`p-5 ${current ? "border-primary" : ""}`}>
                  <View className="flex-row items-center gap-3">
                    <IconTile icon={plan.icon} />
                    <View className="flex-1">
                      <Text className="text-lg font-extrabold text-text">{plan.name}</Text>
                      <Text className="text-[15px] font-bold text-primary">{plan.price}</Text>
                    </View>
                    {current ? <Badge label="Mevcut plan" color="success" icon={CircleCheck} /> : null}
                  </View>
                  <View className="mt-4 gap-2.5">
                    {plan.features.map((feature) => (
                      <View key={feature} className="flex-row items-center gap-2.5">
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-success/10">
                          <Check size={12} color={colors.success} strokeWidth={3} />
                        </View>
                        <Text className="flex-1 text-sm text-text">{feature}</Text>
                      </View>
                    ))}
                  </View>
                  {!active ? (
                    <Button
                      label="Planı seç"
                      size="lg"
                      className="mt-5"
                      loading={loading === plan.id}
                      disabled={loading !== null}
                      onPress={() => void checkout(plan.id)}
                    />
                  ) : null}
                </Card>
              );
            })}
          </View>

          {!active ? (
            <>
              <SectionLabel>Promosyon kodu</SectionLabel>
              <Card>
                <Text className="mb-2 text-sm font-semibold text-text">Hangi plana uygulansın?</Text>
                <ChipRow
                  options={plans.map((p) => ({ value: p.id, label: p.name }))}
                  value={promoPlan}
                  onChange={setPromoPlan}
                />
                <View className="mt-4 flex-row items-start gap-2">
                  <TextField
                    value={promo}
                    onChangeText={(v) => {
                      setPromo(v);
                      setMessage(null);
                    }}
                    placeholder="Promosyon kodu"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    maxLength={32}
                    returnKeyType="done"
                    onSubmitEditing={() => void applyPromo()}
                    icon={Tag}
                    error={promoError}
                    accessibilityLabel="Promosyon kodu"
                    containerClassName="mb-0 flex-1"
                  />
                  <Button
                    label="Uygula"
                    variant="soft"
                    loading={loading === "promo"}
                    disabled={!promoCode || !!promoError || loading !== null}
                    onPress={() => void applyPromo()}
                  />
                </View>
              </Card>
            </>
          ) : null}

          {message ? (
            <Card
              className={`mt-4 flex-row items-center gap-3 ${message.ok ? "border-success/30" : "border-danger/30"}`}
            >
              {message.ok ? (
                <CircleCheck size={18} color={colors.success} />
              ) : (
                <Info size={18} color={colors.danger} />
              )}
              <Text className={`flex-1 text-sm ${message.ok ? "text-text" : "text-danger"}`}>{message.text}</Text>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
