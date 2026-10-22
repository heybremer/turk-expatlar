import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import {
  CircleAlert,
  CircleCheck,
  Copy,
  QrCode,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  X,
} from "lucide-react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { IconTile, SectionLabel } from "@/components/ui/kit";
import { api, ApiError, AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

type SetupResponse = { secret: string; qrDataUrl: string };

function formatSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export default function TwoFactorScreen() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const refreshUser = useAuth((s) => s.refreshUser);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<TextInput>(null);
  const enabled = Boolean(user?.twoFactorEnabled);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!token) return;
    api
      .get<AuthUser>("/users/me", token)
      .then(refreshUser)
      .catch(() => {});
  }, [token, refreshUser]);

  const refresh = async () => {
    if (!token) return;
    refreshUser(await api.get<AuthUser>("/users/me", token));
  };

  const startSetup = async () => {
    if (!token || loading) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      setSetup(await api.get<SetupResponse>("/auth/2fa/setup", token));
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kurulum başlatılamadı.");
      if (err instanceof ApiError && /zaten etkin/i.test(err.message)) void refresh().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const cancelSetup = () => {
    setSetup(null);
    setCode("");
    setError("");
  };

  const submit = async () => {
    if (!token || loading) return;
    if (code.length !== 6) return setError("6 haneli doğrulama kodunu gir.");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.post(enabled ? "/auth/2fa/disable" : "/auth/2fa/enable", { code }, token);
      setSetup(null);
      setCode("");
      setMessage(
        enabled ? "İki aşamalı doğrulama kapatıldı." : "İki aşamalı doğrulama etkinleştirildi.",
      );
      if (user) refreshUser({ ...user, twoFactorEnabled: !enabled });
      await refresh().catch(() => {});
    } catch (err) {
      setCode("");
      setError(err instanceof ApiError ? err.message : "Kod doğrulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async (secret: string) => {
    try {
      await Clipboard.setStringAsync(secret);
      setCopied(true);
    } catch {
      setError("Anahtar kopyalanamadı.");
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
          enabled ? "border-success/30 bg-success/5" : "border-border bg-surface"
        }`}
      >
        <View className="flex-row items-center gap-3.5">
          <IconTile
            icon={enabled ? ShieldCheck : ShieldOff}
            tint={enabled ? colors.success : colors.muted}
            size={48}
          />
          <View className="flex-1">
            <Text className="text-base font-bold text-text">
              {enabled ? "Koruma etkin" : "Koruma kapalı"}
            </Text>
            <View className="mt-1 flex-row">
              <Badge label={enabled ? "Aktif" : "Pasif"} color={enabled ? "success" : "muted"} />
            </View>
          </View>
        </View>
        <Text className="mt-4 text-sm leading-5 text-muted">
          {enabled
            ? "Girişlerde doğrulama uygulamandaki 6 haneli kod istenir. Kapatmak için güncel kodu gir."
            : "Google Authenticator, Microsoft Authenticator veya uyumlu bir uygulama kullanabilirsin."}
        </Text>
      </View>

      {!enabled && !setup ? (
        <Button
          label="Kurulumu başlat"
          size="lg"
          icon={Smartphone}
          className="mt-5"
          onPress={() => void startSetup()}
          loading={loading}
        />
      ) : null}

      {setup ? (
        <>
          <SectionLabel>1. Adım · QR kodu tara</SectionLabel>
          <Card padded={false} className="items-center p-5">
            <View className="mb-4 flex-row items-center gap-2">
              <QrCode size={18} color={colors.primary} />
              <Text className="text-center text-[15px] font-bold text-text">
                QR kodu doğrulama uygulamanla tara
              </Text>
            </View>
            <View className="rounded-2xl border border-border bg-surface p-3">
              <Image
                source={{ uri: setup.qrDataUrl }}
                style={{ width: 208, height: 208 }}
                resizeMode="contain"
                accessibilityLabel="İki aşamalı doğrulama QR kodu"
              />
            </View>
            <Text className="mt-4 text-center text-xs text-muted">
              QR kodu tarayamıyorsan bu anahtarı uygulamaya elle gir:
            </Text>
            <Text
              selectable
              className="mt-1 text-center font-mono text-sm font-bold tracking-wider text-text"
            >
              {formatSecret(setup.secret)}
            </Text>
            <Button
              label={copied ? "Anahtar kopyalandı" : "Kurulum anahtarını kopyala"}
              variant="soft"
              size="sm"
              icon={copied ? CircleCheck : Copy}
              className="mt-4"
              onPress={() => void copySecret(setup.secret)}
            />
          </Card>
        </>
      ) : null}

      {enabled || setup ? (
        <>
          <SectionLabel>{setup ? "2. Adım · Kodu doğrula" : "Doğrulama kodu"}</SectionLabel>
          <Card padded={false} className="p-5">
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                if (error) setError("");
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.mutedLight}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              accessibilityLabel="Doğrulama kodu"
              className="min-h-16 rounded-2xl border border-border bg-background px-4 text-center text-3xl font-extrabold tracking-[10px] text-text"
            />
            <Button
              label={enabled ? "Korumayı kapat" : "Etkinleştir"}
              variant={enabled ? "danger" : "primary"}
              size="lg"
              icon={enabled ? ShieldOff : ShieldCheck}
              className="mt-4"
              onPress={() => void submit()}
              loading={loading}
              disabled={code.length !== 6}
            />
            {setup ? (
              <Button
                label="Vazgeç"
                variant="ghost"
                icon={X}
                className="mt-2"
                onPress={cancelSetup}
                disabled={loading}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      {error ? (
        <View
          accessibilityLiveRegion="polite"
          className="mt-4 flex-row items-center gap-2.5 rounded-2xl bg-danger/10 p-3.5"
        >
          <CircleAlert size={18} color={colors.danger} />
          <Text className="flex-1 text-sm font-medium text-danger">{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View
          accessibilityLiveRegion="polite"
          className="mt-4 flex-row items-center gap-2.5 rounded-2xl bg-success/10 p-3.5"
        >
          <CircleCheck size={18} color={colors.success} />
          <Text className="flex-1 text-sm font-medium text-success">{message}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
