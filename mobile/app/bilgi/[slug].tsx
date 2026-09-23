import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { DetailHeader, Screen } from "@/components/ui/Screen";
import { colors } from "@/lib/colors";
import { INFO_PAGES } from "@/lib/info-pages";

export default function InfoPageScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = INFO_PAGES[slug ?? ""];

  if (!page) {
    return (
      <Screen header={<DetailHeader title="Bilgi" />}>
        <View className="items-center rounded-3xl bg-white p-8">
          <Text className="text-lg font-bold text-slate-900">Sayfa bulunamadı</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-5 min-h-12 justify-center rounded-2xl bg-primary-600 px-6"
            accessibilityRole="button"
          >
            <Text className="font-bold text-white">Geri dön</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<DetailHeader title={page.title} />}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="overflow-hidden rounded-3xl bg-primary-950 p-6">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-primary-200">
          TÜRK EXPATLAR
        </Text>
        <Text className="mt-3 text-2xl font-extrabold text-white">{page.title}</Text>
        <Text className="mt-2 leading-6 text-primary-100">{page.subtitle}</Text>
      </View>

      <View className="mt-4 gap-3">
        {page.sections.map((section, index) => (
          <View
            key={section.title}
            className="rounded-3xl border border-slate-100 bg-white p-5"
            style={{
              shadowColor: colors.text,
              shadowOpacity: 0.04,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View className="mb-3 h-8 w-8 items-center justify-center rounded-xl bg-primary-50">
              <Text className="font-extrabold text-primary-700">{index + 1}</Text>
            </View>
            <Text className="text-lg font-extrabold text-slate-900">{section.title}</Text>
            <Text className="mt-2 text-[15px] leading-6 text-slate-600">{section.body}</Text>
          </View>
        ))}
      </View>

      <View className="mt-5 flex-row flex-wrap gap-2">
        {Object.entries(INFO_PAGES)
          .filter(([key]) => key !== slug)
          .map(([key, item]) => (
            <Pressable
              key={key}
              onPress={() => router.push(`/bilgi/${key}` as never)}
              className="min-h-11 justify-center rounded-full border border-slate-200 bg-white px-4"
              accessibilityRole="link"
            >
              <Text className="font-bold text-slate-600">{item.title}</Text>
            </Pressable>
          ))}
      </View>
    </Screen>
  );
}
