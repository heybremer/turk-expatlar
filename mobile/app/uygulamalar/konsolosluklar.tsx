import { useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Building2, CalendarCheck, Clock, ExternalLink, Flag, Mail, MapPin, Phone } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { SearchBar } from "@/components/ui/SearchBar";
import { ChipRow, LinkRow, Pill, SectionLabel, TipBox, ToolHero } from "@/components/ui/kit";
import { colors } from "@/lib/colors";
import {
  CONSULAR_CALL_CENTER,
  mapsUrl,
  MISSION_TYPE_LABELS,
  telUrl,
  TURKISH_MISSIONS_GERMANY,
  type ConsulateType,
  type TurkishMission,
} from "@/lib/data/consulates";

type Filter = ConsulateType | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "embassy", label: "Büyükelçilik" },
  { value: "general", label: "Başkonsolosluk" },
  { value: "honorary", label: "Fahri" },
];

function MissionCard({ mission, isMine }: { mission: TurkishMission; isMine: boolean }) {
  const address = mission.postalCode
    ? `${mission.address}, ${mission.postalCode} ${mission.city}`
    : mission.address;
  return (
    <View className={`mb-3 rounded-2xl border p-4 ${isMine ? "border-primary/40 bg-primary/5" : "border-border bg-surface"}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <View className="flex-row flex-wrap gap-1.5">
            <Pill
              label={MISSION_TYPE_LABELS[mission.type]}
              tone={mission.type === "embassy" ? "accent" : mission.type === "honorary" ? "muted" : "primary"}
            />
            {isMine ? <Pill label="Senin bölgen" tone="accent" /> : null}
          </View>
          <Text className="mt-2 text-base font-bold text-text">{mission.name}</Text>
          <Text className="text-sm text-muted">{mission.city}</Text>
        </View>
        {mission.website ? (
          <Pressable
            onPress={() => void Linking.openURL(mission.website!)}
            accessibilityRole="link"
            accessibilityLabel={`${mission.name} resmi sitesi`}
            className="h-11 w-11 items-center justify-center rounded-xl bg-background active:opacity-70"
          >
            <ExternalLink size={17} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3 gap-0.5">
        <LinkRow icon={MapPin} label={address} url={mapsUrl(mission)} />
        <LinkRow icon={Phone} label={mission.phone} url={telUrl(mission.phone)} emphasis />
        {mission.emergencyPhone ? (
          <LinkRow
            icon={Phone}
            label={`Acil: ${mission.emergencyPhone}`}
            url={telUrl(mission.emergencyPhone)}
          />
        ) : null}
        {mission.email ? (
          <LinkRow icon={Mail} label={mission.email} url={`mailto:${mission.email}`} />
        ) : null}
        {mission.hours ? <LinkRow icon={Clock} label={mission.hours} /> : null}
      </View>

      <View className="mt-3 flex-row gap-2 rounded-xl bg-background p-3">
        <Building2 size={15} color={colors.muted} />
        <Text className="flex-1 text-xs leading-5 text-muted">
          <Text className="font-bold text-text">Görev bölgesi: </Text>
          {mission.jurisdiction}
        </Text>
      </View>
    </View>
  );
}

export default function ConsulatesScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const profileState = useAuth((s) => s.user?.profile?.state?.name);
  const profileCity = useAuth((s) => s.user?.profile?.city?.name);

  const isMine = (m: TurkishMission) => {
    if (m.type === "embassy") return false;
    const j = m.jurisdiction.toLocaleLowerCase("tr-TR");
    return Boolean(
      (profileCity && (j.includes(profileCity.toLocaleLowerCase("tr-TR")) || m.city === profileCity)) ||
        (profileState && j.includes(profileState.toLocaleLowerCase("tr-TR"))),
    );
  };

  const grouped = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = TURKISH_MISSIONS_GERMANY.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (!q) return true;
      return [m.name, m.city, m.address, m.jurisdiction, m.postalCode].some((field) =>
        (field ?? "").toLocaleLowerCase("tr-TR").includes(q),
      );
    }).sort((a, b) => Number(isMine(b)) - Number(isMine(a)));
    return (["embassy", "general", "honorary"] as ConsulateType[])
      .map((type) => ({ type, items: filtered.filter((m) => m.type === type) }))
      .filter((group) => group.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter, profileState, profileCity]);

  return (
    <Screen title="Konsolosluklar" subtitle="Almanya'daki Türk temsilcilikleri">
      <ToolHero
        icon={Flag}
        tint={colors.danger}
        title="Türk Konsoloslukları"
        subtitle="Büyükelçilik, başkonsolosluk ve fahri konsoloslukların iletişim bilgileri."
      />

      <Pressable
        onPress={() => void Linking.openURL(telUrl(CONSULAR_CALL_CENTER.phone))}
        accessibilityRole="button"
        accessibilityLabel={`${CONSULAR_CALL_CENTER.label} ara: ${CONSULAR_CALL_CENTER.phone}`}
        className="mb-4 flex-row items-center gap-3 rounded-2xl bg-primary p-4 active:opacity-90"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/15">
          <Phone size={20} color={colors.white} />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-white/80">{CONSULAR_CALL_CENTER.label}</Text>
          <Text className="text-lg font-extrabold text-white">{CONSULAR_CALL_CENTER.phone}</Text>
        </View>
      </Pressable>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Şehir, eyalet veya konsolosluk ara…" />
      <ChipRow className="mt-3" options={FILTERS} value={filter} onChange={setFilter} />

      {grouped.length === 0 ? (
        <EmptyState icon={Flag} title="Temsilcilik bulunamadı" subtitle="Farklı bir arama deneyin." />
      ) : (
        grouped.map(({ type, items }) => (
          <View key={type}>
            <SectionLabel count={items.length}>{MISSION_TYPE_LABELS[type]}</SectionLabel>
            {items.map((mission) => (
              <MissionCard key={mission.id} mission={mission} isMine={isMine(mission)} />
            ))}
          </View>
        ))
      )}

      <View className="mt-3">
        <TipBox title="Online randevu">
          Konsolosluk işlemleri için konsolosluk.gov.tr üzerinden randevu alabilirsiniz. Güncel çalışma
          saatlerini temsilciliğin sitesinden kontrol edin.
        </TipBox>
        <Button
          label="Online randevu al"
          icon={CalendarCheck}
          variant="secondary"
          className="mt-3"
          onPress={() => void Linking.openURL("https://www.konsolosluk.gov.tr")}
        />
      </View>
    </Screen>
  );
}
