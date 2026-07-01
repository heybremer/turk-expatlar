import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { login } from "@/lib/auth";
import { loginWithGoogle } from "@/lib/google-auth";
import { ApiError } from "@/lib/api";

export default function GirisScreen() {
  const { error: oauthError } = useLocalSearchParams<{ error?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Hata", "Email ve şifre giriniz.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert(
        "Giriş Başarısız",
        err instanceof ApiError ? err.message : "Bir hata oluştu",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) return;
      Alert.alert(
        "Google Girişi",
        err instanceof ApiError ? err.message : "Bir hata oluştu",
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-12">
          {/* Logo / başlık */}
          <View className="mb-10 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-3xl font-bold text-white">TE</Text>
            </View>
            <Text className="text-2xl font-bold text-text">Türk Expatlar</Text>
            <Text className="mt-1 text-sm text-muted">Almanya'daki Türk topluluğu</Text>
          </View>

          {/* Form */}
          <View className="rounded-2xl bg-surface p-6 shadow-sm">
            <Text className="mb-6 text-xl font-bold text-text">Giriş Yap</Text>

            <Text className="mb-1 text-sm font-medium text-text">E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <Text className="mb-1 text-sm font-medium text-text">Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              className="mb-2 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <Link href="/(auth)/sifre-unuttum" asChild>
              <TouchableOpacity className="mb-6 self-end">
                <Text className="text-sm text-primary">Şifremi unuttum</Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              onPress={() => void handleLogin()}
              disabled={loading || googleLoading}
              className="items-center rounded-xl bg-primary py-4"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Giriş Yap</Text>
              )}
            </TouchableOpacity>

            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-border" />
              <Text className="mx-3 text-xs text-muted">veya</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <GoogleSignInButton
              onPress={() => void handleGoogleLogin()}
              loading={googleLoading}
            />

            {typeof oauthError === "string" && oauthError.length > 0 && (
              <Text className="mt-4 text-center text-sm text-danger">{oauthError}</Text>
            )}
          </View>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-muted">Hesabın yok mu? </Text>
            <Link href="/(auth)/kayit" asChild>
              <TouchableOpacity>
                <Text className="font-semibold text-primary">Kayıt Ol</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
