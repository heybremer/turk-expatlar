import {
  Briefcase,
  CalendarDays,
  CircleHelp,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { api, AuthUser } from "@/lib/api";
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

export default function WelcomeScreen() {
  const router = useRouter();
  const { token, user, refreshUser } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );

  const finish = async (skip = false) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await api.patch(
        "/users/me/profile",
        {
          completeOnboarding: true,
          ...(!skip && selected.length ? { interests: selected } : {}),
        },
        token,
      );
      const me = await api.get<AuthUser>("/users/me", token);
      refreshUser(me);
      router.replace("/(tabs)/akis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tercihler kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}>
      <View className="items-center">
        <Text className="rounded-full bg-primary-50 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-primary-700">
          HOŞ GELDİN
        </Text>
        <Text className="mt-5 text-center text-3xl font-black text-slate-950">
          {user?.profile?.city?.name
            ? `${user.profile.city.name} topluluğuna hoş geldin!`
            : "Topluluğa hoş geldin!"}
        </Text>
        <Text className="mt-3 text-center leading-6 text-slate-500">
          İlgi alanlarını seç, sana uygun içerikleri daha kolay keşfet.
        </Text>
      </View>

      <View className="mt-8 flex-row flex-wrap justify-between gap-y-3">
        {interests.map((item) => {
          const active = selected.includes(item.id);
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              className={`min-h-28 w-[48%] items-center justify-center rounded-3xl border p-4 ${
                active
                  ? "border-primary-500 bg-primary-50"
                  : "border-slate-100 bg-white"
              }`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <Icon
                size={25}
                color={active ? colors.primary : colors.muted}
              />
              <Text
                className={`mt-3 text-center font-extrabold ${
                  active ? "text-primary-800" : "text-slate-700"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text className="mt-5 rounded-2xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void finish(false)}
        disabled={loading}
        className="mt-8 min-h-14 items-center justify-center rounded-2xl bg-primary-600 disabled:opacity-50"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-extrabold text-white">Başla</Text>
        )}
      </Pressable>
      <Pressable
        onPress={() => void finish(true)}
        disabled={loading}
        className="mt-2 min-h-12 items-center justify-center"
        accessibilityRole="button"
      >
        <Text className="font-bold text-slate-500">Şimdilik atla</Text>
      </Pressable>
    </Screen>
  );
}
