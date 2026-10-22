import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  Landmark,
  Map,
  Newspaper,
  Plane,
  Radio,
  Sparkles,
} from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { DetailHeader, Screen } from "@/components/ui/Screen";
import { SectionLabel } from "@/components/ui/kit";
import { colors } from "@/lib/colors";

type Tool = {
  title: string;
  description: string;
  icon: typeof CalendarDays;
  color: string;
  route: Href;
  badge?: string;
};

type Section = { title: string; tools: Tool[] };

const SECTIONS: Section[] = [
  {
    title: "Almanya'da yaşam",
    tools: [
      {
        title: "Yeni Gelen Rehberi",
        description: "Anmeldung'dan vergi numarasına ilk adımlar",
        icon: BookOpenCheck,
        color: "#7C3AED",
        route: "/uygulamalar/yeni-gelen",
        badge: "Kontrol listesi",
      },
      {
        title: "Konsolosluklar",
        description: "Türk temsilcilikleri, adres ve telefonlar",
        icon: Landmark,
        color: "#DC2626",
        route: "/uygulamalar/konsolosluklar",
      },
      {
        title: "Resmî Kurumlar",
        description: "Bürgeramt, Finanzamt, Jobcenter ve diğerleri",
        icon: Building2,
        color: "#2563EB",
        route: "/uygulamalar/resmi-kurumlar",
      },
    ],
  },
  {
    title: "Yol ve seyahat",
    tools: [
      {
        title: "Yolculuk Telsizi",
        description: "Yoldaki gezginlerle bas-konuş sesli iletişim",
        icon: Radio,
        color: "#EA580C",
        route: "/uygulamalar/yolculuk-telsiz",
        badge: "Canlı",
      },
      {
        title: "Gezgin Rehberi",
        description: "Eyalet eyalet gezilecek yerler",
        icon: Map,
        color: "#059669",
        route: "/uygulamalar/gezgin-rehberi",
      },
      {
        title: "Tatil Günleri",
        description: "Eyaletlere göre resmî ve okul tatilleri",
        icon: Plane,
        color: "#0891B2",
        route: "/uygulamalar/tatil-gunleri",
      },
    ],
  },
  {
    title: "Gündem",
    tools: [
      {
        title: "Etkinlik Takvimi",
        description: "Almanya genelinde yaklaşan etkinlikler",
        icon: CalendarDays,
        color: "#DB2777",
        route: "/uygulamalar/etkinlik-takvimi",
      },
      {
        title: "Eyalet Haberleri",
        description: "Bulunduğun eyaletteki gündem",
        icon: Newspaper,
        color: colors.primary,
        route: "/uygulamalar/haberler?type=state",
      },
      {
        title: "Şehir Haberleri",
        description: "Şehrindeki güncel gelişmeler",
        icon: Newspaper,
        color: colors.primaryDark,
        route: "/uygulamalar/haberler?type=city",
      },
    ],
  },
];

export default function MiniAppsScreen() {
  const router = useRouter();

  return (
    <Screen header={<DetailHeader title="Mini Uygulamalar" />}>
      <View className="mb-6 overflow-hidden rounded-3xl bg-primary-950 p-6">
        <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Sparkles size={20} color={colors.white} />
        </View>
        <Text className="mt-4 text-2xl font-extrabold text-white">Almanya cebinde</Text>
        <Text className="mt-1.5 leading-6 text-primary-100">Günlük yaşamı kolaylaştıran araçlar tek yerde.</Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} className="mb-5">
          <SectionLabel>{section.title}</SectionLabel>
          <View className="overflow-hidden rounded-3xl border border-border bg-surface">
            {section.tools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Pressable
                  key={tool.title}
                  onPress={() => router.push(tool.route)}
                  accessibilityRole="button"
                  accessibilityLabel={tool.title}
                  accessibilityHint={tool.description}
                  className={`min-h-20 flex-row items-center gap-4 px-4 py-3.5 active:bg-background ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${tool.color}14` }}
                  >
                    <Icon size={23} color={tool.color} strokeWidth={2.2} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-text" numberOfLines={1}>
                        {tool.title}
                      </Text>
                      {tool.badge ? (
                        <View className="rounded-full bg-primary/10 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-primary">{tool.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-0.5 text-sm leading-5 text-muted" numberOfLines={2}>
                      {tool.description}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.mutedLight} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
