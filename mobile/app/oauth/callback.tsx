import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { completeGoogleOAuthCallback } from "@/lib/google-auth";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string | string[];
    error?: string | string[];
    twofa?: string | string[];
  }>();
  const token = first(params.token);
  const error = first(params.error);
  const twofa = first(params.twofa);
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${token ?? ""}|${error ?? ""}|${twofa ?? ""}`;
    // Token/bilet tek kullanımlık akışa ait; aynı parametrelerle ikinci kez işleme.
    if (handledKey.current === key) return;
    handledKey.current = key;

    void (async () => {
      try {
        // openAuthSessionAsync aynı yönlendirmeyi zaten işlemiş olabilir.
        if (!twofa && !error && useAuth.getState().token) {
          router.replace("/(tabs)/akis");
          return;
        }
        const query = new URLSearchParams();
        if (token) query.set("token", token);
        if (error) query.set("error", error);
        if (twofa) query.set("twofa", twofa);
        const callbackBase = Linking.createURL("/oauth/callback").split("?")[0];
        const result = await completeGoogleOAuthCallback(`${callbackBase}?${query.toString()}`);
        if (result) {
          router.replace({
            pathname: "/(auth)/giris",
            params: { twofa: result.twoFactorTicket },
          });
          return;
        }
        router.replace("/(tabs)/akis");
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Google ile giriş başarısız.";
        router.replace({ pathname: "/(auth)/giris", params: { error: message } });
      }
    })();
  }, [error, token, twofa, router]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel="Google ile giriş yapılıyor"
      className="flex-1 items-center justify-center bg-background px-6"
    >
      <View className="mb-6 h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-sm">
        <Text className="text-2xl font-black tracking-tight text-white">TE</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4 text-base font-bold text-text">Google ile giriş yapılıyor</Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Lütfen bekle, birkaç saniye sürebilir…
      </Text>
    </View>
  );
}
