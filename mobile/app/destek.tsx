import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";

const CATEGORIES = [
  { value: "TECHNICAL", label: "Teknik sorun", icon: "build-outline" },
  { value: "SUGGESTION", label: "Öneri", icon: "bulb-outline" },
  { value: "REQUEST", label: "İstek", icon: "sparkles-outline" },
  { value: "COMPLAINT", label: "Şikayet", icon: "alert-circle-outline" },
  { value: "OTHER", label: "Diğer", icon: "ellipsis-horizontal-circle-outline" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export default function SupportScreen() {
  const { token } = useAuth();
  const [category, setCategory] = useState<Category>("SUGGESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/support", { category, subject: subject.trim(), message: message.trim() }, token),
    onSuccess: () => {
      setSubject("");
      setMessage("");
      setCategory("SUGGESTION");
      Alert.alert("Teşekkür ederiz", "Mesajınız ekibimize iletildi.");
    },
    onError: (error) =>
      Alert.alert(
        "Gönderilemedi",
        error instanceof ApiError ? error.message : "Lütfen tekrar deneyin.",
      ),
  });

  const valid = subject.trim().length >= 5 && message.trim().length >= 20;

  return (
    <Screen
      title="Destek"
      subtitle="Sorun, öneri ve isteklerinizi iletin"
      keyboardAware
    >
      <Card className="mb-5 border-primary/20 bg-primary/5">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="heart-outline" size={22} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-text">Birlikte geliştirelim</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">
              Her mesaj incelenir. İçerik veya kullanıcı şikâyetlerinde ilgili içerikteki şikâyet menüsünü kullanın.
            </Text>
          </View>
        </View>
      </Card>

      <Text className="mb-2 text-sm font-bold text-text">Kategori</Text>
      <View className="mb-5 flex-row flex-wrap gap-2">
        {CATEGORIES.map((item) => {
          const selected = item.value === category;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setCategory(item.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`min-h-11 flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${
                selected ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <Ionicons
                name={item.icon}
                size={17}
                color={selected ? "#0f766e" : "#6b7280"}
              />
              <Text className={selected ? "font-semibold text-primary" : "text-muted"}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="mb-2 text-sm font-bold text-text">Konu başlığı</Text>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        maxLength={200}
        placeholder="Kısa ve açıklayıcı bir başlık"
        placeholderTextColor="#9ca3af"
        className="mb-5 min-h-12 rounded-xl border border-border bg-surface px-4 text-text"
      />

      <View className="mb-2 flex-row justify-between">
        <Text className="text-sm font-bold text-text">Mesajınız</Text>
        <Text className="text-xs text-muted">{message.length}/5000</Text>
      </View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        maxLength={5000}
        multiline
        textAlignVertical="top"
        placeholder="Ne yaşadığınızı veya önerinizi ayrıntılı yazın…"
        placeholderTextColor="#9ca3af"
        className="mb-2 min-h-[160px] rounded-xl border border-border bg-surface px-4 py-3 text-text"
      />
      <Text className="mb-5 text-xs text-muted">En az 20 karakter</Text>

      <Button
        label="Mesajı gönder"
        size="lg"
        loading={mutation.isPending}
        disabled={!valid}
        onPress={() => mutation.mutate()}
      />
    </Screen>
  );
}
