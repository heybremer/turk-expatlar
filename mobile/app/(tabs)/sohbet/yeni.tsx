import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";
import { MessageCircle, Search, UserRound } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, DmListEntry, UserSearchResult } from "@/lib/api";
import { colors } from "@/lib/colors";
import { haptics } from "@/lib/haptics";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { DetailHeader } from "@/components/navigation/DetailHeader";
import { normalizeTr } from "@/components/chat/search";

type Person = { id: string; name: string; avatarUrl?: string | null; subtitle?: string };

const MIN_QUERY = 2;

export default function NewMessageScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [startingDm, setStartingDm] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const { data: dms } = useQuery({
    queryKey: ["chat-dms"],
    queryFn: () => api.get<DmListEntry[]>("/chat/dm/list", token),
    enabled: !!token,
  });

  const q = query.trim();

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setSearchError(false);
    if (!token || q.length < MIN_QUERY) {
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
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setSearchError(true);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [q, token]);

  const recent: Person[] = useMemo(() => {
    const nq = normalizeTr(q);
    return (dms ?? [])
      .filter((d) => d.partner)
      .map((d) => ({
        id: d.partner!.id,
        name: d.partner!.profile?.displayName ?? "Kullanıcı",
        avatarUrl: d.partner!.profile?.avatarUrl,
        subtitle: "Son sohbet",
      }))
      .filter((p) => !nq || normalizeTr(p.name).includes(nq))
      .slice(0, q ? 5 : 20);
  }, [dms, q]);

  const people: Person[] = useMemo(() => {
    if (q.length < MIN_QUERY) return recent;
    const seen = new Set(recent.map((p) => p.id));
    const found = results
      .filter((u) => !seen.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.profile?.displayName ?? "Kullanıcı",
        avatarUrl: u.profile?.avatarUrl,
        subtitle: [u.profile?.city?.name, u.profile?.state?.name].filter(Boolean).join(", ") || undefined,
      }));
    return [...recent, ...found];
  }, [q, recent, results]);

  async function startDm(userId: string) {
    if (!token || startingDm) return;
    setStartingDm(userId);
    try {
      await api.post(`/chat/dm/${userId}`, {}, token);
      haptics.tap();
      router.replace(`/(tabs)/sohbet/dm-${userId}` as never);
    } catch (err) {
      setStartingDm(null);
      haptics.error();
      const message = err instanceof ApiError ? err.message : "Sohbet başlatılamadı";
      Alert.alert("Mesaj başlatılamadı", message);
    }
  }

  const renderEmpty = () => {
    if (!token) return <EmptyState icon={UserRound} title="Giriş yapın" subtitle="Mesaj göndermek için giriş yapmalısınız." />;
    if (q.length < MIN_QUERY) {
      return (
        <EmptyState
          icon={UserRound}
          title="Kullanıcı arayın"
          subtitle={q ? "Aramak için en az 2 karakter girin" : "İsim veya tam e-posta adresiyle arayın"}
        />
      );
    }
    if (searching) {
      return (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (searchError) return <EmptyState icon={Search} title="Arama başarısız" subtitle="Bağlantınızı kontrol edip tekrar deneyin." />;
    return <EmptyState icon={Search} title="Sonuç bulunamadı" subtitle={`"${q}" için kullanıcı bulunamadı`} />;
  };

  return (
    <View className="flex-1 bg-background">
      <DetailHeader title="Yeni Mesaj" subtitle="Bir kullanıcı seçin" onBack={() => router.back()}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="İsim veya e-posta ara…" autoFocus />
      </DetailHeader>

      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        ListHeaderComponent={
          people.length > 0 ? (
            <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
              {q.length < MIN_QUERY ? "Son sohbetler" : "Kişiler"}
            </Text>
          ) : null
        }
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          searching && people.length > 0 ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const first = index === 0;
          const last = index === people.length - 1;
          return (
            <View
              className={`overflow-hidden border-x border-border bg-surface ${first ? "rounded-t-3xl border-t" : ""} ${
                last ? "rounded-b-3xl border-b" : ""
              }`}
            >
              <Pressable
                onPress={() => void startDm(item.id)}
                disabled={!!startingDm}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} ile mesajlaş`}
                accessibilityState={{ busy: startingDm === item.id, disabled: !!startingDm }}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-background"
              >
                <Avatar name={item.name} url={item.avatarUrl} size="md" />
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.subtitle ? (
                    <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                {startingDm === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <MessageCircle size={17} color={colors.primary} />
                  </View>
                )}
              </Pressable>
              {!last ? <View className="ml-[72px] h-px bg-border" /> : null}
            </View>
          );
        }}
      />
    </View>
  );
}
