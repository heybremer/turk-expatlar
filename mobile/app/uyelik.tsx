import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Plan = "USER_YEARLY" | "BUSINESS_YEARLY";
type Subscription = {
  plan: Plan | "FREE_PROMO";
  expiresAt?: string | null;
  promoCode?: { code: string } | null;
};
type MySubscription = {
  subscription: Subscription | null;
  plan: Subscription["plan"] | null;
  isActive: boolean;
};

const plans: Array<{
  id: Plan;
  name: string;
  price: string;
  features: string[];
}> = [
  {
    id: "USER_YEARLY",
    name: "Kullanıcı",
    price: "10 € / yıl",
    features: ["Sınırsız forum", "Etkinlik katılımı", "Rehber ve iş ilanları", "Seyahat yardımlaşması"],
  },
  {
    id: "BUSINESS_YEARLY",
    name: "İşletme",
    price: "50 € / yıl",
    features: ["Kullanıcı planındaki her şey", "Doğrulanmış işletme rozeti", "Premium rehber konumu", "Öne çıkan ilan"],
  },
];

export default function MembershipScreen() {
  const token = useAuth((state) => state.token);
  const qc = useQueryClient();
  const [promo, setPromo] = useState("");
  const [loading, setLoading] = useState<Plan | "promo" | null>(null);
  const [message, setMessage] = useState("");

  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<MySubscription>("/subscriptions/me", token),
  });

  // Stripe ödemesi tarayıcıda tamamlanır; uygulamaya dönünce durumu tazele
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void qc.invalidateQueries({ queryKey: ["subscription"] });
    });
    return () => sub.remove();
  }, [qc]);

  const checkout = async (plan: Plan) => {
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
      Alert.alert("Ödeme başlatılamadı", err instanceof Error ? err.message : "Tekrar deneyin.");
    } finally {
      setLoading(null);
    }
  };

  const applyPromo = async (plan: Plan) => {
    if (!promo.trim()) return;
    setLoading("promo");
    setMessage("");
    try {
      const response = await api.post<{ message: string }>(
        "/subscriptions/promo",
        { code: promo.trim(), plan },
        token,
      );
      setMessage(response.message);
      setPromo("");
      void qc.invalidateQueries({ queryKey: ["subscription"] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Kod uygulanamadı.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Screen title="Üyelik" subtitle="Planını ve avantajlarını yönet">
      {subscription.isLoading ? (
        <LoadingScreen />
      ) : subscription.isError ? (
        <ErrorState title="Üyelik bilgisi yüklenemedi" onRetry={() => void subscription.refetch()} />
      ) : (
        <>
          {subscription.data?.isActive ? (
            <View className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <Badge label="Aktif üyelik" color="success" />
              <Text className="mt-3 text-lg font-bold text-emerald-900">
                {subscription.data.plan === "BUSINESS_YEARLY" ? "İşletme" : "Kullanıcı"} planı
              </Text>
              {subscription.data.subscription?.expiresAt ? (
                <Text className="mt-1 text-sm text-emerald-700">
                  Bitiş: {new Date(subscription.data.subscription.expiresAt).toLocaleDateString("tr-TR")}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View className="gap-4">
            {plans.map((plan) => (
              <View key={plan.id} className="rounded-3xl border border-border bg-surface p-5">
                <Text className="text-xl font-extrabold text-text">{plan.name}</Text>
                <Text className="mt-1 text-lg font-bold text-primary">{plan.price}</Text>
                <View className="mt-4 gap-2">
                  {plan.features.map((feature) => (
                    <Text key={feature} className="text-sm text-muted">✓  {feature}</Text>
                  ))}
                </View>
                {subscription.data?.plan === plan.id && subscription.data.isActive ? (
                  <Text className="mt-5 text-center font-bold text-success">Mevcut planın</Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => void checkout(plan.id)}
                    disabled={loading !== null}
                    className="mt-5 min-h-12 items-center justify-center rounded-xl bg-primary"
                  >
                    {loading === plan.id ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Planı seç</Text>}
                  </TouchableOpacity>
                )}
                <View className="mt-3 flex-row gap-2">
                  <TextInput
                    value={promo}
                    onChangeText={setPromo}
                    placeholder="Promosyon kodu"
                    autoCapitalize="characters"
                    placeholderTextColor="#9ca3af"
                    className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-text"
                  />
                  <TouchableOpacity
                    onPress={() => void applyPromo(plan.id)}
                    disabled={!promo.trim() || loading !== null}
                    className="min-h-11 justify-center rounded-xl border border-primary px-4"
                  >
                    <Text className="font-semibold text-primary">Uygula</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
          {message ? <Text className="mt-4 rounded-xl bg-background p-3 text-center text-sm text-text">{message}</Text> : null}
        </>
      )}
    </Screen>
  );
}
