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
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { register } from "@/lib/auth";
import { loginWithGoogle } from "@/lib/google-auth";
import { ApiError } from "@/lib/api";

export default function KayitScreen() {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [postalCountry, setPostalCountry] = useState<"DE" | "TR">("DE");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password || !postalCode.trim()) {
      Alert.alert("Hata", "Tüm alanları doldurunuz.");
      return;
    }
    if (!gdprConsent) {
      Alert.alert("Hata", "KVKK onayı zorunludur.");
      return;
    }
    setLoading(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        postalCode: postalCode.trim(),
        postalCountry,
        gdprConsent: true,
      });
    } catch (err) {
      Alert.alert("Kayıt Başarısız", err instanceof ApiError ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) return;
      Alert.alert(
        "Google Kaydı",
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
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-12">
          <View className="mb-8 items-center">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-2xl font-bold text-white">TE</Text>
            </View>
            <Text className="text-2xl font-bold text-text">Hesap Oluştur</Text>
          </View>

          <View className="rounded-2xl bg-surface p-6 shadow-sm">
            <Text className="mb-1 text-sm font-medium text-text">Görünen Ad</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Adınız"
              className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <Text className="mb-1 text-sm font-medium text-text">E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <Text className="mb-1 text-sm font-medium text-text">Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="En az 8 karakter"
              secureTextEntry
              className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <Text className="mb-2 text-sm font-medium text-text">Bulunduğunuz Ülke</Text>
            <View className="mb-4 flex-row gap-3">
              {(["DE", "TR"] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setPostalCountry(c)}
                  className={`flex-1 items-center rounded-xl border py-3 ${postalCountry === c ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                >
                  <Text className={`font-semibold ${postalCountry === c ? "text-primary" : "text-muted"}`}>
                    {c === "DE" ? "🇩🇪 Almanya" : "🇹🇷 Türkiye"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mb-1 text-sm font-medium text-text">Posta Kodu</Text>
            <TextInput
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder={postalCountry === "DE" ? "10115" : "34000"}
              keyboardType="numeric"
              className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity
              onPress={() => setGdprConsent((v) => !v)}
              className="mb-6 flex-row items-start gap-3"
            >
              <View className={`mt-0.5 h-5 w-5 rounded border-2 items-center justify-center ${gdprConsent ? "border-primary bg-primary" : "border-border"}`}>
                {gdprConsent && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text className="flex-1 text-sm text-muted">
                Kişisel verilerimin işlenmesine onay veriyorum (KVKK)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleRegister()}
              disabled={loading || googleLoading}
              className="items-center rounded-xl bg-primary py-4"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Kayıt Ol</Text>
              )}
            </TouchableOpacity>

            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-border" />
              <Text className="mx-3 text-xs text-muted">veya</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <GoogleSignInButton
              onPress={() => void handleGoogleRegister()}
              loading={googleLoading}
              label="Google ile kayıt ol"
            />
          </View>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-muted">Zaten hesabın var mı? </Text>
            <Link href="/(auth)/giris" asChild>
              <TouchableOpacity>
                <Text className="font-semibold text-primary">Giriş Yap</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
