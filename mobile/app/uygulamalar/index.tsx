import {
  Building2,
  BookOpenCheck,
  CalendarDays,
  Landmark,
  Map,
  Newspaper,
  Plane,
  Radio,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { DetailHeader, Screen } from "@/components/ui/Screen";

type Tool = {
  title: string;
  description: string;
  icon: typeof CalendarDays;
  color: string;
  bg: string;
  route?: string;
  ready?: boolean;
};

const tools: Tool[] = [
  {
    title: "Yeni Gelen Rehberi",
    description: "Almanya'daki ilk adımlarını sırayla tamamla.",
    icon: BookOpenCheck,
    color: "#7C3AED",
    bg: "#F5F3FF",
    route: "/uygulamalar/web?tool=yeni-gelen",
    ready: true,
  },
  {
    title: "Etkinlik Takvimi",
    description: "Almanya genelindeki yaklaşan etkinlikleri keşfet.",
    icon: CalendarDays,
    color: "#7C3AED",
    bg: "#F5F3FF",
    route: "/uygulamalar/etkinlik-takvimi",
    ready: true,
  },
  {
    title: "Konsolosluklar",
    description: "Türk temsilciliklerinin iletişim bilgilerine ulaş.",
    icon: Landmark,
    color: "#DC2626",
    bg: "#FEF2F2",
    route: "/uygulamalar/web?tool=konsolosluklar",
    ready: true,
  },
  {
    title: "Resmî Kurumlar",
    description: "Almanya'daki temel kurumları ve görevlerini öğren.",
    icon: Building2,
    color: "#2563EB",
    bg: "#EFF6FF",
    route: "/uygulamalar/web?tool=resmi-kurumlar",
    ready: true,
  },
  {
    title: "Gezgin Rehberi",
    description: "Şehir rotaları ve topluluk önerilerini incele.",
    icon: Map,
    color: "#059669",
    bg: "#ECFDF5",
    route: "/uygulamalar/web?tool=gezgin-rehberi",
    ready: true,
  },
  {
    title: "Yolculuk Telsizi",
    description: "Yol durumunu ve seyahat notlarını toplulukla paylaş.",
    icon: Radio,
    color: "#EA580C",
    bg: "#FFF7ED",
    route: "/uygulamalar/web?tool=yolculuk-telsiz",
    ready: true,
  },
  {
    title: "Tatil Günleri",
    description: "Eyaletlere göre resmî tatil günlerini görüntüle.",
    icon: Plane,
    color: "#0891B2",
    bg: "#ECFEFF",
    route: "/uygulamalar/tatil-gunleri",
    ready: true,
  },
  {
    title: "Eyalet Haberleri",
    description: "Bulunduğun eyaletteki gündemi takip et.",
    icon: Newspaper,
    color: "#475569",
    bg: "#F8FAFC",
    route: "/uygulamalar/haberler?type=state",
    ready: true,
  },
  {
    title: "Şehir Haberleri",
    description: "Şehrindeki güncel gelişmeleri takip et.",
    icon: Newspaper,
    color: "#475569",
    bg: "#F8FAFC",
    route: "/uygulamalar/haberler?type=city",
    ready: true,
  },
];

export default function MiniAppsScreen() {
  const router = useRouter();

  return (
    <Screen header={<DetailHeader title="Mini Uygulamalar" />}>
      <View className="mb-5 rounded-3xl bg-primary-950 p-6">
        <Text className="text-2xl font-extrabold text-white">Almanya cebinde</Text>
        <Text className="mt-2 leading-6 text-primary-100">
          Günlük yaşamı kolaylaştıran araçlar tek yerde.
        </Text>
      </View>

      <View className="gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Pressable
              key={tool.title}
              disabled={!tool.ready}
              onPress={() => tool.route && router.push(tool.route as never)}
              className="min-h-24 flex-row items-center rounded-3xl border border-slate-100 bg-white p-4 active:bg-slate-50"
              accessibilityRole="button"
              accessibilityState={{ disabled: !tool.ready }}
            >
              <View
                className="h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: tool.bg }}
              >
                <Icon size={26} color={tool.color} strokeWidth={2.2} />
              </View>
              <View className="ml-4 flex-1">
                <View className="flex-row items-center">
                  <Text className="flex-1 text-base font-extrabold text-slate-900">
                    {tool.title}
                  </Text>
                  {!tool.ready ? (
                    <Text className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                      YAKINDA
                    </Text>
                  ) : null}
                </View>
                <Text className="mt-1 leading-5 text-slate-500">{tool.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="h-6" />
    </Screen>
  );
}
