import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  LayoutGrid,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Plane,
  Search,
  SquarePen,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, HomeFeed, ForumTopic, Event, Business } from "@/lib/api";
import { formatRelative, formatDate } from "@/lib/utils";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ChipRow, IconTile, ListGroup, ListRow, MetaItem, SectionHeader } from "@/components/ui/kit";
import { AppHeader } from "@/components/navigation/AppHeader";

type QuickAction = { label: string; icon: LucideIcon; tint: string; route: string };
type FeedResponse = Partial<HomeFeed> & { guide?: { title: string; slug: string }[] };
type Scope = "local" | "all";

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Forum", icon: MessagesSquare, tint: colors.primary, route: "/(tabs)/forum" },
  { label: "Etkinlikler", icon: CalendarDays, tint: colors.accent, route: "/(tabs)/etkinlikler" },
  { label: "Rehber", icon: Store, tint: colors.warning, route: "/rehber" },
  { label: "İş İlanları", icon: Briefcase, tint: colors.primaryDark, route: "/isler" },
  { label: "Seyahat", icon: Plane, tint: colors.success, route: "/seyahat" },
  { label: "Mini Uygulamalar", icon: LayoutGrid, tint: colors.muted, route: "/uygulamalar" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function TopicCard({ topic }: { topic: ForumTopic }) {
  const router = useRouter();
  return (
    <Card className="mb-3" onPress={() => router.push(`/(tabs)/forum/${topic.id}`)}>
      {topic.category?.name ? <Badge label={topic.category.name} color="primary" /> : null}
      <Text className="mt-2.5 text-[15px] font-bold leading-5 text-text" numberOfLines={2}>
        {topic.title}
      </Text>
      {topic.body ? (
        <Text className="mt-1 text-sm leading-5 text-muted" numberOfLines={2}>
          {topic.body}
        </Text>
      ) : null}
      <View className="mt-3 flex-row flex-wrap items-center gap-4">
        <MetaItem icon={MessageCircle} label={`${topic._count?.replies ?? 0} cevap`} />
        {topic.city?.name ? <MetaItem icon={MapPin} label={topic.city.name} /> : null}
        <Text className="text-xs text-muted">{formatRelative(topic.createdAt)}</Text>
      </View>
    </Card>
  );
}

function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const date = new Date(event.startsAt);
  const validDate = !Number.isNaN(date.getTime());
  return (
    <Card className="mb-3" onPress={() => router.push(`/(tabs)/etkinlikler/${event.id}`)}>
      <View className="flex-row gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <Text className="text-lg font-extrabold leading-5 text-accent">{validDate ? date.getDate() : "–"}</Text>
          <Text className="text-[10px] font-bold uppercase text-accent">
            {validDate ? date.toLocaleDateString("tr-TR", { month: "short" }) : ""}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-text" numberOfLines={2}>
            {event.title}
          </Text>
          <View className="mt-1.5 gap-1">
            {event.city?.name ? <MetaItem icon={MapPin} label={event.city.name} /> : null}
            <MetaItem icon={CalendarDays} label={formatDate(event.startsAt)} />
          </View>
        </View>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Badge
          label={event.priceType === "FREE" ? "Ücretsiz" : "Ücretli"}
          color={event.priceType === "FREE" ? "success" : "primary"}
        />
        <Badge label={`${event._count?.attendees ?? 0} katılımcı`} color="muted" icon={Users} />
      </View>
    </Card>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const router = useRouter();
  const rating = Number(business.averageRating) || 0;
  const meta = [business.category?.name, business.city?.name].filter(Boolean).join(" · ");
  return (
    <Card className="mb-3" onPress={() => router.push(`/rehber/${business.id}`)}>
      <View className="flex-row items-center gap-3">
        <IconTile icon={Store} tint={colors.warning} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-1 text-[15px] font-bold text-text" numberOfLines={1}>
              {business.name}
            </Text>
            {business.isVerified && <BadgeCheck size={16} color={colors.success} />}
          </View>
          {meta ? (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <StarRating rating={rating} size={12} />
        <Text className="text-xs text-muted">
          {rating.toFixed(1)} ({business.reviewCount ?? 0})
        </Text>
        {business.speaksTurkish && <Badge label="Türkçe konuşuyor" color="primary" />}
      </View>
    </Card>
  );
}

export default function AkisScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("local");

  const stateId = user?.profile?.stateId ?? null;
  const cityId = user?.profile?.cityId ?? null;
  const hasLocation = !!(stateId || cityId);
  const locationName = user?.profile?.city?.name ?? user?.profile?.state?.name ?? "Konumum";
  const local = hasLocation && scope === "local";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["home-feed", local ? cityId ?? stateId : "all"],
    queryFn: () => {
      const params: string[] = [];
      if (local && cityId) params.push(`cityId=${encodeURIComponent(cityId)}`);
      else if (local && stateId) params.push(`stateId=${encodeURIComponent(stateId)}`);
      return api.get<FeedResponse>(`/feed/home${params.length ? `?${params.join("&")}` : ""}`, token);
    },
    enabled: !!token,
  });

  const topics = data?.topics ?? [];
  const events = data?.events ?? [];
  const businesses = data?.businesses ?? [];
  const guide = data?.guide ?? [];

  const firstName = user?.profile?.firstName || user?.profile?.displayName?.split(" ")[0];
  const isEmpty = !!data && topics.length === 0 && events.length === 0 && businesses.length === 0;

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Türk Expatlar" subtitle="Almanya'daki Türk topluluğu">
        <Pressable
          onPress={() => router.push("/ara" as never)}
          accessibilityRole="search"
          accessibilityLabel="Ara"
          className="min-h-11 flex-row items-center gap-2 rounded-2xl bg-background px-3.5 active:opacity-70"
        >
          <Search size={17} color={colors.mutedLight} />
          <Text className="text-[15px] text-muted-light">Forum, etkinlik, işletme ara…</Text>
        </Pressable>
      </AppHeader>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View className="overflow-hidden rounded-3xl bg-primary-950 p-6">
          <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
          <Text className="text-sm font-semibold text-primary-100">{greeting()},</Text>
          <Text className="mt-1 text-2xl font-extrabold text-white" numberOfLines={1}>
            {firstName ?? "hoş geldin"} 👋
          </Text>
          <Text className="mt-2 text-sm leading-5 text-primary-100">
            Bugün toplulukta neler oluyor, birlikte bakalım.
          </Text>
        </View>

        <View className="mt-4 flex-row gap-2">
          <Button
            label="Soru sor"
            icon={SquarePen}
            variant="secondary"
            size="sm"
            className="flex-1"
            onPress={() => router.push("/(tabs)/forum/yeni" as never)}
          />
          <Button
            label="Etkinlik oluştur"
            icon={CalendarPlus}
            size="sm"
            className="flex-1"
            onPress={() => router.push("/(tabs)/etkinlikler/yeni" as never)}
          />
        </View>

        <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route as never)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              className="w-[31.5%] items-center rounded-3xl border border-border bg-surface px-2 py-4 active:opacity-70"
            >
              <IconTile icon={action.icon} tint={action.tint} />
              <Text className="mt-2 text-center text-xs font-semibold text-text" numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {hasLocation ? (
          <ChipRow
            className="mt-5"
            options={[
              { value: "local", label: locationName },
              { value: "all", label: "Tüm Almanya" },
            ]}
            value={scope}
            onChange={setScope}
          />
        ) : null}

        {isLoading ? (
          <View className="-mx-4 mt-2">
            <SkeletonList count={3} />
          </View>
        ) : isError ? (
          <ErrorState title="Akış yüklenemedi" onRetry={() => void refetch()} />
        ) : isEmpty || !data ? (
          <EmptyState
            icon={Newspaper}
            title={local ? `${locationName} için henüz içerik yok` : "Henüz içerik yok"}
            subtitle="Forum konuları, etkinlikler ve işletmeler burada görünecek."
            actionLabel={local ? "Tüm Almanya'yı göster" : "Foruma git"}
            onAction={() => (local ? setScope("all") : router.push("/(tabs)/forum"))}
          />
        ) : (
          <>
            {topics.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Son Forum Konuları" onAction={() => router.push("/(tabs)/forum")} />
                {topics.slice(0, 3).map((t) => (
                  <TopicCard key={t.id} topic={t} />
                ))}
              </View>
            )}
            {events.length > 0 && (
              <View className="mt-6">
                <SectionHeader
                  title="Yaklaşan Etkinlikler"
                  onAction={() => router.push("/(tabs)/etkinlikler")}
                />
                {events.slice(0, 3).map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </View>
            )}
            {businesses.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Öne Çıkan İşletmeler" onAction={() => router.push("/rehber" as never)} />
                {businesses.slice(0, 3).map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </View>
            )}
          </>
        )}

        {!isLoading && !isError && guide.length > 0 ? (
          <View className="mt-6">
            <SectionHeader
              title="Yeni gelenler için rehber"
              onAction={() => router.push("/uygulamalar/yeni-gelen" as never)}
            />
            <ListGroup>
              {guide.map((g, i) => (
                <ListRow
                  key={g.slug}
                  first={i === 0}
                  icon={BookOpen}
                  tint={colors.success}
                  title={g.title}
                  onPress={() => router.push("/uygulamalar/yeni-gelen" as never)}
                />
              ))}
            </ListGroup>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
