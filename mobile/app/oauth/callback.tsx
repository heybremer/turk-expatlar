import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { completeGoogleOAuthCallback } from "@/lib/google-auth";
import { ApiError } from "@/lib/api";

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; error?: string; twofa?: string }>();

  useEffect(() => {
    void (async () => {
      try {
        const query = new URLSearchParams();
        if (typeof params.token === "string") query.set("token", params.token);
        if (typeof params.error === "string") query.set("error", params.error);
        if (typeof params.twofa === "string") query.set("twofa", params.twofa);
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
        const message =
          err instanceof ApiError ? err.message : "Google ile giriş başarısız.";
        router.replace(`/(auth)/giris?error=${encodeURIComponent(message)}`);
      }
    })();
  }, [params.error, params.token, params.twofa, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <ActivityIndicator size="large" color="#0f766e" />
      <Text className="mt-4 text-muted">Google ile giriş yapılıyor...</Text>
    </View>
  );
}
