import { useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { ExternalLink, Info, Landmark, Phone } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { SearchBar } from "@/components/ui/SearchBar";
import { ChipRow, LinkRow, Pill, SectionLabel, TipBox, ToolHero } from "@/components/ui/kit";
import { colors } from "@/lib/colors";
import {
  INSTITUTION_CATEGORY_LABELS,
  INSTITUTION_SCOPE_LABELS,
  OFFICIAL_HOTLINES,
  OFFICIAL_INSTITUTIONS,
  telUrl,
  type InstitutionCategory,
  type OfficialInstitution,
} from "@/lib/data/official-institutions";

type Filter = InstitutionCategory | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tümü" },
  ...(Object.keys(INSTITUTION_CATEGORY_LABELS) as InstitutionCategory[]).map((value) => ({
    value,
    label: INSTITUTION_CATEGORY_LABELS[value],
  })),
];

function InstitutionCard({ inst }: { inst: OfficialInstitution }) {
  return (
    <View className="mb-3 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <View className="flex-row flex-wrap gap-1.5">
            <Pill label={INSTITUTION_CATEGORY_LABELS[inst.category]} />
            <Pill label={INSTITUTION_SCOPE_LABELS[inst.scope]} tone="muted" />
          </View>
          <Text className="mt-2 text-base font-bold text-text">{inst.name}</Text>
          <Text className="text-sm text-muted">{inst.nameDe}</Text>
        </View>
        <Pressable
          onPress={() => void Linking.openURL(inst.website)}
          accessibilityRole="link"
          accessibilityLabel={`${inst.name} resmi sitesi`}
          className="h-11 w-11 items-center justify-center rounded-xl bg-background active:opacity-70"
        >
          <ExternalLink size={17} color={colors.primary} />
        </Pressable>
      </View>

      <Text className="mt-3 text-sm leading-5 text-text">{inst.description}</Text>

      <View className="mt-3 rounded-xl bg-background p-3">
        <Text className="text-xs font-bold text-text">Ne zaman başvurulur?</Text>
        <Text className="mt-1 text-xs leading-5 text-muted">{inst.whenToContact}</Text>
      </View>

      {inst.phone || inst.note ? (
        <View className="mt-2">
          {inst.phone ? (
            <LinkRow icon={Phone} label={inst.phone} url={telUrl(inst.phone)} emphasis />
          ) : null}
          {inst.note ? <LinkRow icon={Info} label={inst.note} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export default function OfficialInstitutionsScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return OFFICIAL_INSTITUTIONS.filter((inst) => {
      if (filter !== "all" && inst.category !== filter) return false;
      if (!q) return true;
      return [inst.name, inst.nameDe, inst.description, inst.whenToContact].some((field) =>
        field.toLocaleLowerCase("tr-TR").includes(q),
      );
    });
  }, [query, filter]);

  return (
    <Screen title="Resmî Kurumlar" subtitle="Almanya'daki kurumlar ve görevleri">
      <ToolHero
        icon={Landmark}
        tint="#2563EB"
        title="Almanya Resmî Kurumlar"
        subtitle="Yabancılar dairesi, kayıt ofisi, iş ajansı ve diğerleri: ne işe yarar, nereye başvurulur?"
      />

      {OFFICIAL_HOTLINES.map((line) => (
        <Pressable
          key={line.phone}
          onPress={() => void Linking.openURL(telUrl(line.phone))}
          accessibilityRole="button"
          accessibilityLabel={`${line.label} ara: ${line.phone}`}
          className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 active:opacity-80"
        >
          <Text className="text-sm font-bold text-text">{line.label}</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Phone size={17} color={colors.primary} />
            <Text className="text-base font-extrabold text-primary">{line.phone}</Text>
          </View>
          <Text className="mt-1 text-xs text-muted">{line.hours}</Text>
        </Pressable>
      ))}

      <TipBox title="Önemli" tone="warning">
        Ausländerbehörde, Bürgeramt ve Finanzamt gibi birçok kurum şehre ve eyalete göre değişir. Randevu
        için yaşadığın şehrin resmî sitesini kullan.
      </TipBox>

      <SearchBar
        className="mt-4"
        value={query}
        onChangeText={setQuery}
        placeholder="Kurum ara (ör. yabancılar, vergi, iş)…"
      />
      <ChipRow className="mt-3" options={FILTERS} value={filter} onChange={setFilter} />

      <SectionLabel count={filtered.length}>Kurumlar</SectionLabel>
      {filtered.length === 0 ? (
        <EmptyState icon={Landmark} title="Kurum bulunamadı" subtitle="Farklı bir arama deneyin." />
      ) : (
        filtered.map((inst) => <InstitutionCard key={inst.id} inst={inst} />)
      )}
    </Screen>
  );
}
