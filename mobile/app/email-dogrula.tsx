import { CircleCheck, CircleX, Send } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { api, ApiError, AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

type Status = "loading" | "success" | "error";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = (Array.isArray(params.token) ? params.token[0] : params.token)?.trim() ?? "";
  const authToken = useAuth((state) => state.token);
  const emailVerified = useAuth((state) => state.user?.emailVerified);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("E-posta adresin doğrulanıyor…");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const verifiedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Doğrulama bağlantısı geçersiz veya eksik.");
      return;
    }
    // Token tek kullanımlık: aynı token ikinci kez gönderilirse backend hata döner.
    if (verifiedToken.current === token) return;
    verifiedToken.current = token;
    setStatus("loading");

    api
      .get<{ message?: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        setStatus("success");
        setMessage(response?.message ?? "E-posta adresin başarıyla doğrulandı.");
        const { token: sessionToken, refreshUser } = useAuth.getState();
        if (sessionToken) {
          try {
            refreshUser(await api.get<AuthUser>("/users/me", sessionToken));
          } catch {
            // Profil yenilenemese de doğrulama başarılı
          }
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Bağlantı geçersiz veya süresi dolmuş.");
      });
  }, [token]);

  const resend = async () => {
    if (!authToken || resending) return;
    setResending(true);
    setResendMessage("");
    try {
      const res = await api.post<{ message?: string }>("/auth/resend-verification", {}, authToken);
      setResendMessage(res?.message ?? "Doğrulama e-postası tekrar gönderildi.");
    } catch (err) {
      setResendMessage(err instanceof ApiError ? err.message : "E-posta gönderilemedi.");
    } finally {
      setResending(false);
    }
  };

  const destination = authToken ? "/(tabs)/akis" : "/(auth)/giris";

  return (
    <Screen
      title="E-posta Doğrulama"
      scroll={false}
      contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 16 }}
    >
      <Card padded={false} className="items-center p-8">
        <View
          className={`h-20 w-20 items-center justify-center rounded-full ${
            status === "success"
              ? "bg-success/10"
              : status === "error"
                ? "bg-danger/10"
                : "bg-primary/10"
          }`}
        >
          {status === "loading" ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : status === "success" ? (
            <CircleCheck size={40} color={colors.success} />
          ) : (
            <CircleX size={40} color={colors.danger} />
          )}
        </View>
        <Text
          accessibilityRole="header"
          className="mt-6 text-center text-2xl font-extrabold text-text"
        >
          {status === "loading"
            ? "Doğrulanıyor"
            : status === "success"
              ? "E-posta doğrulandı"
              : "Doğrulama başarısız"}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          className="mt-3 text-center text-[15px] leading-6 text-muted"
        >
          {message}
        </Text>
        {status !== "loading" ? (
          <View className="mt-7 w-full">
            <Button
              label={authToken ? "Akışa git" : "Giriş yap"}
              size="lg"
              onPress={() => router.replace(destination)}
            />
            {status === "error" && authToken && !emailVerified ? (
              <Button
                label="Yeni doğrulama e-postası gönder"
                variant="ghost"
                icon={Send}
                className="mt-2"
                loading={resending}
                onPress={() => void resend()}
              />
            ) : null}
            {resendMessage ? (
              <Text className="mt-3 text-center text-sm text-muted">{resendMessage}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
