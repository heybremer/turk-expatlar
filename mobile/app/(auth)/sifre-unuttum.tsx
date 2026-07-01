import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";

export default function SifreUnuttumScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      Alert.alert("Hata", err instanceof ApiError ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        {sent ? (
          <View className="rounded-2xl bg-surface p-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="mail-outline" size={28} color="#1a56db" />
            </View>
            <Text className="text-xl font-bold text-text mb-2">E-posta Gönderildi</Text>
            <Text className="text-muted text-center mb-6">
              Şifre sıfırlama bağlantısı {email} adresine gönderildi.
            </Text>
            <TouchableOpacity onPress={() => router.back()} className="items-center rounded-xl bg-primary px-8 py-3">
              <Text className="text-white font-semibold">Giriş Sayfasına Dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="rounded-2xl bg-surface p-6 shadow-sm">
            <Text className="text-xl font-bold text-text mb-2">Şifremi Unuttum</Text>
            <Text className="text-muted text-sm mb-6">
              E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
            </Text>

            <Text className="mb-1 text-sm font-medium text-text">E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-6 rounded-xl border border-border bg-background px-4 py-3 text-text"
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={loading}
              className="items-center rounded-xl bg-primary py-4 mb-3"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Bağlantı Gönder</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center justify-center gap-1 py-2">
              <Ionicons name="arrow-back" size={14} color="#1a56db" />
              <Text className="text-primary text-sm">Geri Dön</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
