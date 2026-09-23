import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

type Status = "loading" | "success" | "error";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const authToken = useAuth((state) => state.token);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("E-posta adresin doğrulanıyor…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Doğrulama bağlantısı geçersiz veya eksik.");
      return;
    }

    api
      .get<{ message?: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setStatus("success");
        setMessage(response.message ?? "E-posta adresin başarıyla doğrulandı.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "Bağlantı geçersiz veya süresi dolmuş.",
        );
      });
  }, [token]);

  const destination = authToken ? "/(tabs)/akis" : "/(auth)/giris";

  return (
    <Screen
      scroll={false}
      contentContainerStyle={{ flex: 1, justifyContent: "center" }}
    >
      <View className="items-center rounded-3xl border border-slate-100 bg-white p-8">
        <View
          className={`h-20 w-20 items-center justify-center rounded-full ${
            status === "success"
              ? "bg-emerald-50"
              : status === "error"
                ? "bg-red-50"
                : "bg-primary-50"
          }`}
        >
          {status === "loading" ? (
            <LoaderCircle size={38} color={colors.primary} />
          ) : status === "success" ? (
            <CheckCircle2 size={40} color="#16A34A" />
          ) : (
            <XCircle size={40} color="#DC2626" />
          )}
        </View>
        <Text className="mt-6 text-center text-2xl font-extrabold text-slate-900">
          {status === "loading"
            ? "Doğrulanıyor"
            : status === "success"
              ? "E-posta doğrulandı"
              : "Doğrulama başarısız"}
        </Text>
        <Text className="mt-3 text-center leading-6 text-slate-500">{message}</Text>
        {status !== "loading" ? (
          <Pressable
            onPress={() => router.replace(destination)}
            className="mt-7 min-h-12 w-full items-center justify-center rounded-2xl bg-primary-600"
            accessibilityRole="button"
          >
            <Text className="font-bold text-white">
              {authToken ? "Akışa git" : "Giriş yap"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
