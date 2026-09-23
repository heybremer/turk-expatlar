import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { DetailHeader, Screen } from "@/components/ui/Screen";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/colors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? "" : "Bağlantı geçersiz veya eksik.");

  const submit = async () => {
    if (!token) return;
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    if (password !== confirm) return setError("Şifreler eşleşmiyor.");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      keyboard
      header={<DetailHeader title="Yeni Şifre" />}
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
    >
      <View className="rounded-3xl border border-slate-100 bg-white p-6">
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
          {success ? (
            <CheckCircle2 size={28} color="#16A34A" />
          ) : (
            <KeyRound size={28} color={colors.primary} />
          )}
        </View>
        <Text className="text-2xl font-extrabold text-slate-900">
          {success ? "Şifren güncellendi" : "Yeni şifreni belirle"}
        </Text>
        <Text className="mt-2 leading-6 text-slate-500">
          {success
            ? "Artık yeni şifrenle güvenle giriş yapabilirsin."
            : "Hesabın için en az 8 karakterli yeni bir şifre oluştur."}
        </Text>

        {!success ? (
          <View className="mt-6 gap-4">
            {[{ label: "Yeni şifre", value: password, set: setPassword }, { label: "Şifre tekrarı", value: confirm, set: setConfirm }].map(
              (field) => (
                <View key={field.label}>
                  <Text className="mb-2 text-sm font-bold text-slate-700">{field.label}</Text>
                  <View className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <TextInput
                      value={field.value}
                      onChangeText={field.set}
                      secureTextEntry={!visible}
                      autoCapitalize="none"
                      className="min-h-12 flex-1 text-slate-900"
                      placeholder="••••••••"
                      placeholderTextColor={colors.mutedLight}
                    />
                    <Pressable
                      onPress={() => setVisible((value) => !value)}
                      className="h-11 w-11 items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={visible ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {visible ? <EyeOff size={19} color={colors.muted} /> : <Eye size={19} color={colors.muted} />}
                    </Pressable>
                  </View>
                </View>
              ),
            )}
            {error ? <Text className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</Text> : null}
            <Pressable
              disabled={loading || !token}
              onPress={() => void submit()}
              className="min-h-12 items-center justify-center rounded-2xl bg-primary-600 disabled:opacity-50"
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Şifremi güncelle</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.replace("/(auth)/giris")}
            className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-primary-600"
            accessibilityRole="button"
          >
            <Text className="font-bold text-white">Giriş yap</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}
