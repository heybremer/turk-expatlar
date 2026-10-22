import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Forward, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, DmListEntry, UserSearchResult } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { SearchBar } from "@/components/ui/SearchBar";
import { normalizeTr } from "@/components/chat/search";

type Target = { userId: string; name: string; avatarUrl?: string | null };

type Props = {
  visible: boolean;
  token: string | null;
  onClose: () => void;
  onSelect: (target: Target) => void;
};

export function ForwardModal({ visible, token, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [dms, setDms] = useState<DmListEntry[]>([]);
  const [loadingDms, setLoadingDms] = useState(false);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!visible || !token) return;
    setQuery("");
    setResults([]);
    setLoadingDms(true);
    api
      .get<DmListEntry[]>("/chat/dm/list", token)
      .then(setDms)
      .catch(() => setDms([]))
      .finally(() => setLoadingDms(false));
  }, [visible, token]);

  useEffect(() => {
    const q = query.trim();
    const requestId = ++requestIdRef.current;
    if (!token || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .get<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`, token)
        .then((res) => {
          if (requestId === requestIdRef.current) setResults(res);
        })
        .catch(() => {
          if (requestId === requestIdRef.current) setResults([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, token]);

  const data: Target[] = useMemo(() => {
    const nq = normalizeTr(query.trim());
    const recent = dms
      .filter((d) => d.partner)
      .map((d) => ({
        userId: d.partner!.id,
        name: d.partner!.profile?.displayName ?? "Kullanıcı",
        avatarUrl: d.partner!.profile?.avatarUrl,
      }))
      .filter((t) => !nq || normalizeTr(t.name).includes(nq));
    const seen = new Set(recent.map((t) => t.userId));
    const found = results
      .filter((u) => !seen.has(u.id))
      .map((u) => ({ userId: u.id, name: u.profile?.displayName ?? "Kullanıcı", avatarUrl: u.profile?.avatarUrl }));
    return [...recent, ...found];
  }, [dms, results, query]);

  const loading = (searching || loadingDms) && data.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40" accessibilityLabel="Kapat">
          <Pressable
            onPress={() => {}}
            className="max-h-[80%] rounded-t-3xl bg-surface px-4 pt-2.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-border" />
            <View className="mb-3 flex-row items-center">
              <View className="w-9" />
              <View className="flex-1 items-center">
                <Text className="text-[17px] font-bold text-text">Mesajı İlet</Text>
                <Text className="text-xs text-muted">Kime göndermek istiyorsunuz?</Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-70"
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <SearchBar value={query} onChangeText={setQuery} placeholder="Kişi ara…" className="mb-2" />

            {data.length > 0 && !query.trim() ? (
              <Text className="mb-1 mt-3 px-1 text-xs font-bold uppercase tracking-wider text-muted">Son sohbetler</Text>
            ) : null}

            {loading ? (
              <View className="items-center py-8">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : data.length === 0 ? (
              <Text className="py-8 text-center text-sm text-muted">
                {query.trim().length >= 2
                  ? "Sonuç bulunamadı"
                  : query.trim()
                    ? "Aramak için en az 2 karakter girin"
                    : "Henüz mesajlaşmanız yok. Bir kişi arayın."}
              </Text>
            ) : (
              <FlatList
                data={data}
                keyExtractor={(t) => t.userId}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                  searching ? (
                    <View className="items-center py-3">
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => onSelect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name} kişisine ilet`}
                    className="min-h-14 flex-row items-center gap-3 rounded-2xl px-2 py-2 active:bg-background"
                  >
                    <Avatar name={item.name} url={item.avatarUrl} size="sm" />
                    <Text className="flex-1 text-[15px] font-semibold text-text" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Forward size={15} color={colors.primary} />
                    </View>
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
