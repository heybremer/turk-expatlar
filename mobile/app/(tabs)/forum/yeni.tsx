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
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type Category = { id: string; name: string; slug: string };

export default function YeniForumKonusu() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => api.get<Category[]>("/forum/categories", token),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: () => api.post<{ id: string }>("/forum/topics", { title, body, categoryId }, token),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["forum-topics"] });
      router.replace(`/(tabs)/forum/${res.id}`);
    },
    onError: () => Alert.alert("Hata", "Konu oluşturulamadı"),
  });

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader
        title="Yeni Konu"
        action={
          <TouchableOpacity
            onPress={() => { if (title.trim() && body.trim() && categoryId) createMut.mutate(); }}
            disabled={!title.trim() || !body.trim() || !categoryId || createMut.isPending}
            className={`bg-primary rounded-xl px-4 py-2 ${(!title.trim() || !body.trim() || !categoryId || createMut.isPending) ? "opacity-50" : ""}`}
          >
            {createMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-semibold text-sm">Paylaş</Text>}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text className="text-sm font-medium text-text mb-1">Kategori</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories?.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                className={`rounded-full px-4 py-2 border ${categoryId === cat.id ? "bg-primary border-primary" : "bg-surface border-border"}`}
              >
                <Text className={`text-sm font-medium ${categoryId === cat.id ? "text-white" : "text-muted"}`}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">Başlık</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Konunun başlığını yazın…"
            placeholderTextColor="#9ca3af"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text"
            maxLength={150}
          />
          <Text className="text-xs text-muted mt-1 text-right">{title.length}/150</Text>
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">İçerik</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Sorunuzu veya konuyu detaylıca açıklayın…"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text min-h-[160]"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
