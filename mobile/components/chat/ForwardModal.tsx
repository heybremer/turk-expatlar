import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, DmListEntry, UserSearchResult } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { SearchBar } from "@/components/ui/SearchBar";

type Target = { userId: string; name: string; avatarUrl?: string | null };

type Props = {
  visible: boolean;
  token: string | null;
  onClose: () => void;
  onSelect: (target: Target) => void;
};

export function ForwardModal({ visible, token, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [dms, setDms] = useState<DmListEntry[]>([]);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !token) return;
    setQuery("");
    setResults([]);
    api
      .get<DmListEntry[]>("/chat/dm/list", token)
      .then(setDms)
      .catch(() => setDms([]));
  }, [visible, token]);

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

  const showingSearch = query.trim().length >= 2;
  const data: Target[] = showingSearch
    ? results.map((u) => ({ userId: u.id, name: u.profile?.displayName ?? "Kullanıcı", avatarUrl: u.profile?.avatarUrl }))
    : dms
        .filter((d) => d.partner)
        .map((d) => ({ userId: d.partner!.id, name: d.partner!.profile?.displayName ?? "Kullanıcı", avatarUrl: d.partner!.profile?.avatarUrl }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-surface rounded-t-2xl pt-2 pb-4 px-4 max-h-[75%]">
          <View className="self-center w-10 h-1 rounded-full bg-border mb-3" />
          <Text className="text-base font-bold text-text text-center mb-3">Mesajı İlet</Text>

          <View className="mb-2">
            <SearchBar value={query} onChangeText={setQuery} placeholder="Kişi ara…" />
          </View>

          {searching ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#1a56db" />
            </View>
          ) : data.length === 0 ? (
            <Text className="text-sm text-muted text-center py-6">
              {showingSearch ? "Sonuç bulunamadı" : "Henüz mesajlaşmanız yok"}
            </Text>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(t) => t.userId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  className="flex-row items-center gap-3 py-2.5 border-b border-border"
                >
                  <Avatar name={item.name} url={item.avatarUrl} size="sm" />
                  <Text className="flex-1 text-sm font-medium text-text">{item.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
