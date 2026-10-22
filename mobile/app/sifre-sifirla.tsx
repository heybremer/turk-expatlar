import { CircleAlert, CircleCheck, KeyRound, Lock, LogIn, Send } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = (Array.isArray(params.token) ? params.token[0] : params.token)?.trim() ?? "";
  const authToken = useAuth((state) => state.token);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState(token ? "" : "Bağlantı geçersiz veya eksik.");
  const [tokenInvalid, setTokenInvalid] = useState(!token);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!token || loading) return;
    const errors: typeof fieldErrors = {};
    if (password.length < 8) errors.password = "Şifre en az 8 karakter olmalı.";
    if (!confirm) errors.confirm = "Şifreni tekrar gir.";
    else if (password !== confirm) errors.confirm = "Şifreler eşleşmiyor.";
    setFieldErrors(errors);
    if (errors.password || errors.confirm) return;

    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ message?: string }>("/auth/reset-password", { token, password });
      setSuccessMessage(res?.message ?? "Artık yeni şifrenle güvenle giriş yapabilirsin.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Şifre güncellenemedi.";
      if (/geçersiz|süresi dolmuş|bulunamadı/i.test(message)) setTokenInvalid(true);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const success = successMessage !== null;

  return (
    <Screen
      title="Yeni Şifre"
      keyboardAware
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
    >
      <Card padded={false} className="p-6">
        <View
          className={`mb-5 h-14 w-14 items-center justify-center rounded-2xl ${
            success ? "bg-success/10" : "bg-primary/10"
          }`}
        >
          {success ? (
            <CircleCheck size={28} color={colors.success} />
          ) : (
            <KeyRound size={28} color={colors.primary} />
          )}
        </View>
        <Text className="text-2xl font-extrabold text-text">
          {success ? "Şifren güncellendi" : "Yeni şifreni belirle"}
        </Text>
        <Text className="mt-2 text-[15px] leading-6 text-muted">
          {success
            ? successMessage
            : "Hesabın için en az 8 karakterli yeni bir şifre oluştur."}
        </Text>

        {!success ? (
          <View className="mt-6">
            {!tokenInvalid ? (
              <>
                <TextField
                  label="Yeni şifre"
                  icon={Lock}
                  password
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  placeholder="En az 8 karakter"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  error={fieldErrors.password}
                />
                <TextField
                  ref={confirmRef}
                  label="Şifre tekrarı"
                  icon={Lock}
                  password
                  value={confirm}
                  onChangeText={(v) => {
                    setConfirm(v);
                    if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  placeholder="••••••••"
                  returnKeyType="done"
                  onSubmitEditing={() => void submit()}
                  error={fieldErrors.confirm}
                />
              </>
            ) : null}
            {error ? (
              <View className="mb-4 flex-row items-center gap-2.5 rounded-2xl bg-danger/10 p-3.5">
                <CircleAlert size={18} color={colors.danger} />
                <Text className="flex-1 text-sm font-semibold text-danger">{error}</Text>
              </View>
            ) : null}
            {tokenInvalid ? (
              <Button
                label={authToken ? "Akışa dön" : "Yeni bağlantı iste"}
                size="lg"
                icon={authToken ? undefined : Send}
                onPress={() =>
                  router.replace(authToken ? "/(tabs)/akis" : "/(auth)/sifre-unuttum")
                }
              />
            ) : (
              <Button
                label="Şifremi güncelle"
                size="lg"
                onPress={() => void submit()}
                loading={loading}
              />
            )}
          </View>
        ) : (
          <View className="mt-6">
            <Button
              label={authToken ? "Akışa dön" : "Giriş yap"}
              size="lg"
              icon={LogIn}
              onPress={() => router.replace(authToken ? "/(tabs)/akis" : "/(auth)/giris")}
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}
