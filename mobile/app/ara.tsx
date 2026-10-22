import { useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, MessagesSquare, Search, SearchX, Store, UserRound } from "lucide-react-native";
import { api, Business, Event, ForumTopic, UserSearchResult } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { DetailHeader, Screen } from "@/components/ui/Screen";
import { SearchBar } from "@/components/ui/SearchBar";
import { ListGroup, ListRow, SectionLabel } from "@/components/ui/kit";

type SearchResults = {
  topics?: ForumTopic[];
  events?: Event[];
  businesses?: Business[];
};

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim());
  const enabled = term.length >= 2;

  const result = useQuery({
    queryKey: ["global-search", term],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(term)}`, token),
    enabled,
    placeholderData: keepPreviousData,
  });
  const users = useQuery({
    queryKey: ["user-search", term],
    queryFn: () => api.get<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(term)}`, token),
    enabled: enabled && !!token,
    placeholderData: keepPreviousData,
  });

  const topics = result.data?.topics ?? [];
  const events = result.data?.events ?? [];
  const businesses = result.data?.businesses ?? [];
  const people = users.data ?? [];
  const total = topics.length + events.length + businesses.length + people.length;

  return (
    <Screen
      header={
        <DetailHeader title="Arama" subtitle="Forum, etkinlik, işletme ve kişiler">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="En az 2 karakter yazın…"
            autoFocus
          />
        </DetailHeader>
      }
      refreshControl={
        enabled ? (
          <RefreshControl
            refreshing={(result.isRefetching || users.isRefetching) && !result.isLoading}
            onRefresh={() => {
              void result.refetch();
              if (token) void users.refetch();
            }}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {!enabled ? (
        <EmptyState
          icon={Search}
          title="Ne arıyorsunuz?"
          subtitle="Forum konuları, etkinlikler, işletmeler ve üyeler arasında arayın."
        />
      ) : result.isLoading ? (
        <View className="-m-4">
          <SkeletonList count={4} />
        </View>
      ) : result.isError && !people.length ? (
        <ErrorState title="Arama yapılamadı" onRetry={() => void result.refetch()} />
      ) : total === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sonuç bulunamadı"
          subtitle="Başka bir kelime deneyin veya forumda yeni bir soru sorun."
          actionLabel="Soru sor"
          onAction={() => router.push("/(tabs)/forum/yeni" as never)}
        />
      ) : (
        <View className="-mt-6">
          {topics.length > 0 && (
            <>
              <SectionLabel count={topics.length}>Forum</SectionLabel>
              <ListGroup>
                {topics.map((topic, i) => (
                  <ListRow
                    key={topic.id}
                    first={i === 0}
                    icon={MessagesSquare}
                    title={topic.title}
                    subtitle={[topic.category?.name, `${topic._count?.replies ?? 0} cevap`, topic.city?.name]
                      .filter(Boolean)
                      .join(" · ")}
                    onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}
                  />
                ))}
              </ListGroup>
            </>
          )}
          {events.length > 0 && (
            <>
              <SectionLabel count={events.length}>Etkinlikler</SectionLabel>
              <ListGroup>
                {events.map((event, i) => (
                  <ListRow
                    key={event.id}
                    first={i === 0}
                    icon={CalendarDays}
                    tint={colors.accent}
                    title={event.title}
                    subtitle={[event.city?.name, formatDate(event.startsAt)].filter(Boolean).join(" · ")}
                    onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}`)}
                  />
                ))}
              </ListGroup>
            </>
          )}
          {businesses.length > 0 && (
            <>
              <SectionLabel count={businesses.length}>İşletmeler</SectionLabel>
              <ListGroup>
                {businesses.map((business, i) => (
                  <ListRow
                    key={business.id}
                    first={i === 0}
                    icon={Store}
                    tint={colors.warning}
                    title={business.name}
                    subtitle={[business.category?.name, business.city?.name].filter(Boolean).join(" · ")}
                    onPress={() => router.push(`/rehber/${business.id}`)}
                  />
                ))}
              </ListGroup>
            </>
          )}
          {people.length > 0 && (
            <>
              <SectionLabel count={people.length}>Kişiler</SectionLabel>
              <ListGroup>
                {people.map((person, i) => {
                  const name = person.profile?.displayName ?? "Kullanıcı";
                  return (
                    <ListRow
                      key={person.id}
                      first={i === 0}
                      icon={person.profile?.avatarUrl ? undefined : UserRound}
                      title={name}
                      subtitle={[person.profile?.city?.name, person.profile?.state?.name].filter(Boolean).join(", ") || undefined}
                      right={person.profile?.avatarUrl ? <Avatar name={name} url={person.profile.avatarUrl} size="sm" /> : undefined}
                      onPress={() => router.push(`/kullanici/${person.id}` as never)}
                    />
                  );
                })}
              </ListGroup>
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
