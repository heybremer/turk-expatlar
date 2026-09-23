import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { api, ApiError, AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type SetupResponse = { secret: string; qrDataUrl: string };

export default function TwoFactorScreen() {
  const { token, user, refreshUser } = useAuth();
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const enabled = Boolean(user?.twoFactorEnabled);

  const refresh = async () => {
    if (!token) return;
    refreshUser(await api.get<AuthUser>("/users/me", token));
  };

  const startSetup = async () => {
    setLoading(true);
    setError("");
    try {
      setSetup(await api.get<SetupResponse>("/auth/2fa/setup", token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kurulum başlatılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (code.length !== 6) return setError("6 haneli doğrulama kodunu gir.");
    setLoading(true);
    setError("");
    try {
      await api.post(enabled ? "/auth/2fa/disable" : "/auth/2fa/enable", { code }, token);
      await refresh();
      setSetup(null);
      setCode("");
      setMessage(
        enabled
          ? "İki aşamalı doğrulama kapatıldı."
          : "İki aşamalı doğrulama etkinleştirildi.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kod doğrulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="İki Aşamalı Doğrulama"
      subtitle="Hesabına ek güvenlik katmanı ekle"
      keyboardAware
    >
      <View
        className={`rounded-3xl border p-5 ${
          enabled ? "border-emerald-200 bg-emerald-50" : "border-border bg-surface"
        }`}
      >
        <Text className={`text-lg font-bold ${enabled ? "text-emerald-800" : "text-text"}`}>
          {enabled ? "Koruma etkin" : "Koruma kapalı"}
        </Text>
        <Text className="mt-2 leading-6 text-muted">
          {enabled
            ? "Girişlerde doğrulama uygulamandaki 6 haneli kod istenir."
            : "Google Authenticator, Microsoft Authenticator veya uyumlu bir uygulama kullanabilirsin."}
        </Text>
      </View>

      {!enabled && !setup ? (
        <TouchableOpacity
          onPress={() => void startSetup()}
          disabled={loading}
          className="mt-5 min-h-12 items-center justify-center rounded-xl bg-primary"
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Kurulumu başlat</Text>}
        </TouchableOpacity>
      ) : null}

      {setup ? (
        <View className="mt-5 items-center rounded-3xl border border-border bg-surface p-5">
          <Text className="mb-4 text-center font-semibold text-text">
            QR kodu doğrulama uygulamanla tara
          </Text>
          <Image source={{ uri: setup.qrDataUrl }} className="h-52 w-52" />
          <TouchableOpacity
            onPress={() => void Clipboard.setStringAsync(setup.secret)}
            className="mt-3 min-h-11 justify-center rounded-xl bg-background px-4"
          >
            <Text className="font-semibold text-primary">Kurulum anahtarını kopyala</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {(enabled || setup) ? (
        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-text">
            Doğrulama kodu
          </Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            className="min-h-14 rounded-xl border border-border bg-surface px-4 text-center text-2xl font-bold tracking-[8px] text-text"
          />
          <TouchableOpacity
            onPress={() => void submit()}
            disabled={loading || code.length !== 6}
            className={`mt-3 min-h-12 items-center justify-center rounded-xl disabled:opacity-40 ${
              enabled ? "bg-danger" : "bg-primary"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">
                {enabled ? "Korumayı kapat" : "Etkinleştir"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {error ? <Text className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</Text> : null}
      {message ? <Text className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</Text> : null}
    </Screen>
  );
}
