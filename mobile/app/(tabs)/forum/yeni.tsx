import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, FederalState } from "@/lib/api";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type Category = { id: string; name: string; slug: string };

export default function YeniForumKonusu() {
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stateId, setStateId] = useState(user?.profile?.stateId ?? "");
  const [cityId, setCityId] = useState(user?.profile?.cityId ?? "");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => api.get<Category[]>("/forum/categories", token),
    enabled: !!token,
  });

  const { data: states } = useQuery({
    queryKey: ["locations-states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
  });

  const selectedState = states?.find((s) => s.id === stateId);

  const createMut = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(
        "/forum/topics",
        {
          title,
          body,
          categoryId,
          stateId: stateId || undefined,
          cityId: cityId || undefined,
          isAnonymous,
        },
        token,
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["forum-topics"] });
      router.replace(`/(tabs)/forum/${res.id}`);
    },
    onError: () => Alert.alert("Hata", "Konu oluşturulamadı"),
  });

  function submit() {
    if (title.trim().length < 5) {
      Alert.alert("Uyarı", "Başlık en az 5 karakter olmalı");
      return;
    }
    if (body.trim().length < 20) {
      Alert.alert("Uyarı", "Açıklama en az 20 karakter olmalı");
      return;
    }
    if (!categoryId) {
      Alert.alert("Uyarı", "Bir kategori seçin");
      return;
    }
    createMut.mutate();
  }

  const canSubmit = title.trim().length >= 5 && body.trim().length >= 20 && !!categoryId && !createMut.isPending;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader
        title="Yeni Konu"
        action={
          <TouchableOpacity
            onPress={submit}
            disabled={!canSubmit}
            className={`bg-primary rounded-xl px-4 py-2 ${!canSubmit ? "opacity-50" : ""}`}
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
            placeholder="Örn: Anmeldung randevusu bulamıyorum"
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
            placeholder="Durumunu, denediklerini ve ne tür cevap aradığını yaz."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text min-h-[160]"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">Eyalet (opsiyonel)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {states?.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setStateId((prev) => (prev === s.id ? "" : s.id));
                  setCityId("");
                }}
                className={`rounded-full px-4 py-2 border ${stateId === s.id ? "bg-primary border-primary" : "bg-surface border-border"}`}
              >
                <Text className={`text-sm font-medium ${stateId === s.id ? "text-white" : "text-muted"}`}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedState && (
          <View>
            <Text className="text-sm font-medium text-text mb-2">Şehir (opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {selectedState.cities.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCityId((prev) => (prev === c.id ? "" : c.id))}
                  className={`rounded-full px-4 py-2 border ${cityId === c.id ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={`text-sm font-medium ${cityId === c.id ? "text-white" : "text-muted"}`}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-medium text-text">Anonim olarak gönder</Text>
            <Text className="text-xs text-muted mt-0.5">Moderasyon onayından geçer</Text>
          </View>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: "#1a56db" }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
