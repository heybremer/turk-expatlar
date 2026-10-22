import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { FileQuestion, LifeBuoy, Mail } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, LinkRow, SectionLabel } from "@/components/ui/kit";
import { INFO_PAGES } from "@/lib/info-pages";

export default function InfoPageScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = INFO_PAGES[slug ?? ""];

  if (!page) {
    return (
      <Screen title="Bilgi" scroll={false}>
        <EmptyState
          icon={FileQuestion}
          title="Sayfa bulunamadı"
          subtitle="Aradığın bilgi sayfası taşınmış veya kaldırılmış olabilir."
          actionLabel="Geri dön"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const others = Object.entries(INFO_PAGES)
    .filter(([key]) => key !== slug)
    .map(([key, item]) => ({ value: key, label: item.title }));

  return (
    <Screen title={page.title} contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden rounded-3xl bg-primary-950 p-6">
        <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-700/40" />
        <Text className="text-xs font-bold uppercase tracking-[2px] text-primary-200">
          TÜRK EXPATLAR
        </Text>
        <Text className="mt-3 text-2xl font-extrabold text-white">{page.title}</Text>
        <Text className="mt-2 leading-6 text-primary-100">{page.subtitle}</Text>
      </View>

      <View className="mt-4 gap-3">
        {(page.sections ?? []).map((section, index) => (
          <Card key={section.title} className="p-5">
            <View className="mb-3 h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Text className="font-extrabold text-primary">{index + 1}</Text>
            </View>
            <Text className="text-base font-bold text-text">{section.title}</Text>
            <Text className="mt-2 text-[15px] leading-6 text-muted" selectable>
              {section.body}
            </Text>
          </Card>
        ))}
      </View>

      {slug === "iletisim" || slug === "impressum" ? (
        <Card className="mt-3">
          <LinkRow icon={Mail} label="iletisim@turkexpatlar.de" url="mailto:iletisim@turkexpatlar.de" emphasis />
          <Button
            label="Destek formunu aç"
            icon={LifeBuoy}
            variant="soft"
            size="sm"
            className="mt-2"
            onPress={() => router.push("/destek" as never)}
          />
        </Card>
      ) : null}

      <SectionLabel>Diğer sayfalar</SectionLabel>
      <ChipRow
        options={others}
        value=""
        onChange={(key) => router.replace(`/bilgi/${key}` as never)}
      />
    </Screen>
  );
}
