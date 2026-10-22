import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, CircleAlert, KeyRound, Mail, MailCheck, RotateCw, Send } from "lucide-react-native";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SifreUnuttumScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/giris");
  };

  async function handleSubmit() {
    if (loading) return;
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setEmailError("Geçerli bir e-posta adresi gir.");
      return;
    }
    setEmailError("");
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ message?: string }>("/auth/forgot-password", { email: value });
      setSentMessage(
        res?.message ?? "Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bağlantı gönderilemedi. Tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  const errorBanner = error ? (
    <View className="mt-4 flex-row items-center gap-2.5 rounded-2xl bg-danger/10 p-3.5">
      <CircleAlert size={18} color={colors.danger} />
      <Text className="flex-1 text-sm font-medium text-danger">{error}</Text>
    </View>
  ) : null;

  if (sentMessage) {
    return (
      <AuthLayout
        icon={MailCheck}
        title="E-posta gönderildi"
        subtitle="Gelen kutunu (ve spam klasörünü) kontrol et. Bağlantı 1 saat geçerlidir."
        onBack={goBack}
      >
        <Card padded={false} className="p-5">
          <Text className="text-[15px] leading-6 text-muted">{sentMessage}</Text>
          <Text className="mt-2 text-sm font-bold text-text">{email.trim()}</Text>
          <View className="mt-5">
            <Button label="Giriş sayfasına dön" size="lg" onPress={goBack} />
            <Button
              label="Tekrar gönder"
              variant="ghost"
              icon={RotateCw}
              className="mt-2"
              loading={loading}
              onPress={() => void handleSubmit()}
            />
            <Button
              label="Farklı e-posta kullan"
              variant="ghost"
              className="mt-1"
              disabled={loading}
              onPress={() => {
                setSentMessage(null);
                setError("");
              }}
            />
          </View>
          {errorBanner}
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={KeyRound}
      title="Şifremi unuttum"
      subtitle="E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim."
      onBack={goBack}
    >
      <TextField
        label="E-posta"
        icon={Mail}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (emailError) setEmailError("");
        }}
        placeholder="ornek@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        autoFocus
        onSubmitEditing={() => void handleSubmit()}
        error={emailError}
      />
      <Button
        label="Bağlantı gönder"
        size="lg"
        className="mt-2"
        icon={Send}
        onPress={() => void handleSubmit()}
        loading={loading}
        disabled={!email.trim()}
      />
      {errorBanner}
      <Button
        label="Geri dön"
        variant="ghost"
        icon={ArrowLeft}
        className="mt-2"
        onPress={goBack}
        disabled={loading}
      />
    </AuthLayout>
  );
}
