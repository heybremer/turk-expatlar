import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";

type IconName = keyof typeof Ionicons.glyphMap;

type AppItem = {
  icon: IconName;
  label: string;
  description: string;
  route: string;
};

const APPS: AppItem[] = [
  { icon: "newspaper-outline", label: "Eyalet Haberleri", description: "Bulunduğunuz eyaletten son haberler", route: "/uygulamalar/haberler?type=state" },
  { icon: "business-outline", label: "Şehir Haberleri", description: "Şehrinizdeki gelişmeler", route: "/uygulamalar/haberler?type=city" },
  { icon: "calendar-outline", label: "Tatil Günleri", description: "Almanya'daki resmi tatil günleri", route: "/uygulamalar/tatil-gunleri" },
  { icon: "storefront-outline", label: "İş Rehberi", description: "Türkçe konuşan işletmeler", route: "/rehber" },
  { icon: "briefcase-outline", label: "İş İlanları", description: "Almanya'da iş fırsatları", route: "/isler" },
];

export default function UygulamalarIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <View className="bg-surface border-b border-border px-4 pb-4" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center gap-3">
          <BackButton />
          <View className="flex-1">
            <Text className="text-xl font-bold text-text">Mini Uygulamalar</Text>
            <Text className="text-sm text-muted mt-1">Almanya'daki expat yaşamı için araçlar</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {APPS.map((app) => (
          <TouchableOpacity key={app.label} onPress={() => router.push(app.route as Parameters<typeof router.push>[0])}>
            <Card className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-primary/10 rounded-2xl items-center justify-center">
                <Ionicons name={app.icon} size={22} color="#1a56db" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-text">{app.label}</Text>
                <Text className="text-xs text-muted mt-0.5">{app.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
