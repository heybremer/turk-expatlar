import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react-native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PostalLocation,
  PostalLocationErrors,
  PostalLocationFields,
  validatePostalLocation,
} from "@/components/auth/PostalLocationFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { SectionLabel } from "@/components/ui/kit";
import { api, ApiError, AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";

const interests = [
  { id: "etkinlik", label: "Etkinlikler", icon: CalendarDays },
  { id: "forum", label: "Forum & sorular", icon: CircleHelp },
  { id: "is", label: "İş & kariyer", icon: Briefcase },
  { id: "rehber", label: "İşletme rehberi", icon: MapPin },
  { id: "sohbet", label: "Sohbet", icon: MessageCircle },
  { id: "seyahat", label: "Seyahat / eşya", icon: Sparkles },
];

const QUICK_LINKS: { href: Href; label: string; desc: string }[] = [
  { href: "/(tabs)/forum", label: "Foruma göz at", desc: "Anmeldung, kira, vize…" },
  { href: "/(tabs)/etkinlikler", label: "Etkinlikleri keşfet", desc: "Şehrindeki buluşmalar" },
  { href: "/rehber", label: "Rehberi keşfet", desc: "Türkçe hizmet veren işletmeler" },
  { href: "/(tabs)/sohbet", label: "Sohbete katıl", desc: "Eyalet ve şehir kanalları" },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const refreshUser = useAuth((s) => s.refreshUser);
  const [selected, setSelected] = useState<string[]>(() => user?.profile?.interests ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsPostal] = useState(() => !/^\d{5}$/.test(user?.profile?.postalCode?.trim() ?? ""));
  const [location, setLocation] = useState<PostalLocation>(() => ({
    postalCountry: user?.profile?.postalCountry === "TR" ? "TR" : "DE",
    postalCode: "",
    stateId: user?.profile?.stateId ?? "",
    cityId: user?.profile?.cityId ?? "",
  }));
  const [locationErrors, setLocationErrors] = useState<PostalLocationErrors>({});

  const toggle = (id: string) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );

  const finish = async (skip = false, target: Href = "/(tabs)/akis") => {
    if (!token || loading) return;
    if (needsPostal) {
      const errors = validatePostalLocation(location);
      setLocationErrors(errors);
      if (errors.postalCode || errors.location) {
        setError("Devam etmek için konum bilgilerini tamamla.");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      const isDe = location.postalCountry === "DE";
      await api.patch(
        "/users/me/profile",
        {
          completeOnboarding: true,
          ...(needsPostal
            ? {
                postalCode: location.postalCode,
                postalCountry: location.postalCountry,
                ...(isDe ? { stateId: location.stateId, cityId: location.cityId } : {}),
              }
            : {}),
          ...(!skip && selected.length ? { interests: selected } : {}),
        },
        token,
      );
      const me = await api.get<AuthUser>("/users/me", token);
      refreshUser(me);
      router.replace(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tercihler kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const cityName = user?.profile?.city?.name;

  return (
    <Screen keyboardAware contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}>
      <View className="overflow-hidden rounded-3xl bg-primary-950 p-6">
        <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
        <View className="self-start rounded-full bg-white/15 px-3 py-1.5">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-white">Hoş geldin</Text>
        </View>
        <Text accessibilityRole="header" className="mt-4 text-2xl font-extrabold text-white">
          {cityName ? `${cityName} topluluğuna hoş geldin!` : "Topluluğa hoş geldin!"}
        </Text>
        <Text className="mt-2 text-[15px] leading-6 text-primary-100">
          İlgi alanlarını seç, sana uygun içerikleri daha kolay keşfet.
        </Text>
      </View>

      {needsPostal ? (
        <>
          <SectionLabel>Konum</SectionLabel>
          <Card padded={false} className="px-5 pb-1 pt-5">
            <Text className="text-base font-bold text-text">Nerede yaşıyorsun?</Text>
            <Text className="mb-4 mt-1 text-sm leading-5 text-muted">
              Sana yakın etkinlik ve sohbetleri gösterebilmemiz için posta kodun gerekli.
            </Text>
            <PostalLocationFields
              value={location}
              onChange={(patch) => {
                setLocation((prev) => ({ ...prev, ...patch }));
                setLocationErrors({});
                if (error) setError("");
              }}
              errors={locationErrors}
            />
          </Card>
        </>
      ) : null}

      <SectionLabel count={selected.length || undefined}>İlgi alanların</SectionLabel>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {interests.map((item) => {
          const active = selected.includes(item.id);
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              className={`min-h-28 w-[48%] items-center justify-center rounded-3xl border p-4 active:opacity-70 ${
                active ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={item.label}
            >
              {active ? (
                <View className="absolute right-3 top-3 h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check size={12} color={colors.white} strokeWidth={3} />
                </View>
              ) : null}
              <View
                className={`h-12 w-12 items-center justify-center rounded-2xl ${
                  active ? "bg-primary" : "bg-background"
                }`}
              >
                <Icon size={22} color={active ? colors.white : colors.muted} />
              </View>
              <Text
                className={`mt-3 text-center text-sm font-bold ${active ? "text-primary" : "text-text"}`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Hızlı başlangıç</SectionLabel>
      <Card padded={false}>
        {QUICK_LINKS.map((link, index) => (
          <Pressable
            key={link.label}
            onPress={() => void finish(false, link.href)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={link.label}
            accessibilityHint={link.desc}
            className={`min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-background ${
              index === 0 ? "" : "border-t border-border"
            }`}
          >
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-text">{link.label}</Text>
              <Text className="mt-0.5 text-xs text-muted">{link.desc}</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedLight} />
          </Pressable>
        ))}
      </Card>

      {error ? (
        <View
          accessibilityLiveRegion="polite"
          className="mt-5 flex-row items-center gap-2.5 rounded-2xl bg-danger/10 p-3.5"
        >
          <CircleAlert size={18} color={colors.danger} />
          <Text className="flex-1 text-sm font-semibold text-danger">{error}</Text>
        </View>
      ) : null}

      <Button
        label="Başla"
        size="lg"
        className="mt-8"
        onPress={() => void finish(false)}
        loading={loading}
      />
      <Button
        label="Şimdilik atla"
        variant="ghost"
        className="mt-2"
        onPress={() => void finish(true)}
        disabled={loading}
      />
    </Screen>
  );
}
