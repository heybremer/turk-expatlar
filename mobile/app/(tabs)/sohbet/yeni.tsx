import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api, ApiError, UserSearchResult } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function NewMessageScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingDm, setStartingDm] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api
        .get<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(query.trim())}`, token)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, token]);

  async function startDm(userId: string) {
    if (!token || startingDm) return;
    setStartingDm(userId);
    try {
      await api.post(`/chat/dm/${userId}`, {}, token);
      router.replace(`/(tabs)/sohbet/dm-${userId}` as never);
    } catch (err) {
      setStartingDm(null);
      const message = err instanceof ApiError ? err.message : "Sohbet başlatılamadı";
      Alert.alert("Mesaj başlatılamadı", message);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title="Yeni Mesaj" subtitle="Bir kullanıcı seçin" onBack={() => router.back()} />

      <View className="px-4 py-3">
        <View className="flex-row items-center gap-2 bg-surface rounded-full px-3.5 py-2.5 border border-border">
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="İsim veya e-posta ara…"
            placeholderTextColor="#9ca3af"
            autoFocus
            className="flex-1 text-sm text-text"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim().length < 2 ? (
        <EmptyState icon="person-add-outline" title="Kullanıcı arayın" subtitle="En az 2 karakter girin" />
      ) : searching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1a56db" />
        </View>
      ) : results.length === 0 ? (
        <EmptyState icon="search-outline" title="Sonuç bulunamadı" subtitle={`"${query}" için kullanıcı bulunamadı`} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => {
            const name = item.profile?.displayName ?? "Kullanıcı";
            const location = [item.profile?.city?.name, item.profile?.state?.name].filter(Boolean).join(", ");
            return (
              <TouchableOpacity
                onPress={() => void startDm(item.id)}
                disabled={!!startingDm}
                className="flex-row items-center gap-3 px-4 py-3 border-b border-border bg-surface"
              >
                <Avatar name={name} url={item.profile?.avatarUrl} size="md" />
                <View className="flex-1 min-w-0">
                  <Text className="font-semibold text-text">{name}</Text>
                  {location ? <Text className="text-xs text-muted mt-0.5">{location}</Text> : null}
                </View>
                {startingDm === item.id ? (
                  <ActivityIndicator size="small" color="#1a56db" />
                ) : (
                  <Ionicons name="chatbubble-outline" size={18} color="#9ca3af" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
