import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function SifreDegistir() {
  const { token } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const changeMut = useMutation({
    mutationFn: () => api.patch("/users/me/password", { currentPassword: current, newPassword: next }, token),
    onSuccess: () => {
      Alert.alert("Başarılı", "Şifre değiştirildi");
      router.back();
    },
    onError: (e) => Alert.alert("Hata", e instanceof ApiError ? e.message : "Şifre değiştirilemedi"),
  });

  function handleSubmit() {
    if (!current || !next || !confirm) { Alert.alert("Hata", "Tüm alanları doldurun"); return; }
    if (next !== confirm) { Alert.alert("Hata", "Yeni şifreler eşleşmiyor"); return; }
    if (next.length < 8) { Alert.alert("Hata", "Şifre en az 8 karakter olmalı"); return; }
    changeMut.mutate();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader title="Şifre Değiştir" />

      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {[
          { label: "Mevcut Şifre", value: current, onChange: setCurrent },
          { label: "Yeni Şifre", value: next, onChange: setNext },
          { label: "Yeni Şifre (Tekrar)", value: confirm, onChange: setConfirm },
        ].map(({ label, value, onChange }) => (
          <View key={label}>
            <Text className="text-sm font-medium text-text mb-1">{label}</Text>
            <TextInput value={value} onChangeText={onChange} secureTextEntry placeholder="••••••••" placeholderTextColor="#9ca3af" className="bg-surface border border-border rounded-xl px-4 py-3 text-text" />
          </View>
        ))}

        <Button label="Şifreyi Değiştir" loading={changeMut.isPending} onPress={handleSubmit} size="lg" className="mt-2" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
