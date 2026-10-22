import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  Banknote,
  BookOpenCheck,
  Briefcase,
  Building2,
  Car,
  Check,
  CreditCard,
  ExternalLink,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  MessageCircleQuestion,
  Phone,
  type LucideIcon,
} from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ToolHero } from "@/components/ui/kit";
import { colors } from "@/lib/colors";

type Step = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  forumCategory?: { slug: string; label: string };
  resourceUrl?: string;
};

const STEPS: Step[] = [
  {
    id: "anmeldung",
    icon: Home,
    title: "Anmeldung (Adres Kaydı)",
    description:
      "Taşındıktan sonra 14 gün içinde Bürgeramt'ta adres kaydı yaptırmalısın. Çoğu işlem için bu belge ön şart.",
    forumCategory: { slug: "resmi-islemler", label: "Deneyimleri oku" },
    resourceUrl: "https://service.berlin.de/dienstleistung/120686/",
  },
  {
    id: "banka",
    icon: Banknote,
    title: "Banka Hesabı",
    description: "N26, DKB, Commerzbank gibi seçenekler. Anmeldung olmadan açılabilen online bankalar da var.",
    forumCategory: { slug: "is-bulma", label: "Önerileri gör" },
  },
  {
    id: "sim",
    icon: Phone,
    title: "SIM Kart / Mobil Hat",
    description: "Prepaid (Aldi Talk, Lidl Connect) hızlı başlangıç. Sözleşmeli hatlar Anmeldung ve banka hesabı ister.",
  },
  {
    id: "sigorta",
    icon: HeartPulse,
    title: "Krankenkasse (Sağlık Sigortası)",
    description: "Almanya'da zorunludur. TK, AOK, Barmer en yaygın yasal sağlık sigortalarıdır.",
    forumCategory: { slug: "saglik", label: "Sağlık forumu" },
  },
  {
    id: "vergi",
    icon: IdCard,
    title: "Steuer-ID (Vergi Numarası)",
    description: "Anmeldung sonrası 2–4 hafta içinde posta ile gelir. İşe başlamadan önce işverene verilir.",
    forumCategory: { slug: "vergi", label: "Vergi soruları" },
  },
  {
    id: "oturum",
    icon: Building2,
    title: "Oturum İzni (Aufenthaltstitel)",
    description: "AB dışından geliyorsan Ausländerbehörde'de oturum başvurusu yapman gerekir. Randevuyu önceden al.",
    forumCategory: { slug: "resmi-islemler", label: "Konuya git" },
  },
  {
    id: "is",
    icon: Briefcase,
    title: "İş Bulma",
    description: "LinkedIn, StepStone, Indeed, Make-it-in-Germany; Türk işverenler için topluluk önerileri.",
    forumCategory: { slug: "is-bulma", label: "İş forumu" },
  },
  {
    id: "almanca",
    icon: GraduationCap,
    title: "Almanca Kursu",
    description: "Volkshochschule (VHS) uygun fiyatlı. Goethe Institut sertifikalı sınavlar için.",
    forumCategory: { slug: "almanca", label: "Almanca forumu" },
  },
  {
    id: "ev",
    icon: Home,
    title: "Ev Arama",
    description: "ImmoScout24, WG-Gesucht, Immowelt. Schufa raporu ve maaş bordrosu istenir.",
    forumCategory: { slug: "ev-bulma", label: "Ev forumu" },
  },
  {
    id: "rundfunk",
    icon: CreditCard,
    title: "Rundfunkbeitrag (TV/Radyo Ücreti)",
    description: "Anmeldung sonrası otomatik gelir. Hane başına aylık yaklaşık 18,36 €.",
  },
  {
    id: "ehliyet",
    icon: Car,
    title: "Ehliyet Değişimi",
    description: "Türk ehliyeti Almanya'da en fazla 6 ay geçerli; sonra Alman ehliyetine çevrilmesi gerekir.",
  },
  {
    id: "posta",
    icon: Globe,
    title: "Uluslararası Posta",
    description: "Deutsche Post ve DHL en yaygın seçenekler. Türkiye'ye paket için PTT Almanya hizmetleri var.",
  },
];

const STORAGE_KEY = "newcomer-guide-done";

export default function NewcomerGuideScreen() {
  const router = useRouter();
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => raw && setDone(JSON.parse(raw) as string[]))
      .catch(() => undefined);
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  const progress = Math.round((done.length / STEPS.length) * 100);

  return (
    <Screen title="Yeni Gelen Rehberi" subtitle="Almanya'daki ilk adımlar">
      <ToolHero
        icon={BookOpenCheck}
        tint="#7C3AED"
        title="Adım adım başla"
        subtitle="Tamamladığın adımları işaretle; ilerlemen bu cihazda saklanır."
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-text">
            {done.length}/{STEPS.length} adım tamamlandı
          </Text>
          <Text className="text-sm font-extrabold text-primary">%{progress}</Text>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-background">
          <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </View>
      </ToolHero>

      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const checked = done.includes(step.id);
        return (
          <View
            key={step.id}
            className={`mb-3 rounded-2xl border p-4 ${checked ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}
          >
            <View className="flex-row items-start gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-muted">ADIM {index + 1}</Text>
                <Text className={`mt-0.5 text-base font-bold ${checked ? "text-primary" : "text-text"}`}>
                  {step.title}
                </Text>
              </View>
              <Pressable
                onPress={() => toggle(step.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${step.title} tamamlandı`}
                className="-m-1.5 h-11 w-11 items-center justify-center"
              >
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
                    checked ? "border-primary bg-primary" : "border-border bg-surface"
                  }`}
                >
                  {checked ? <Check size={16} color={colors.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            </View>
            <Text className="mt-3 text-sm leading-5 text-muted">{step.description}</Text>
            {step.forumCategory || step.resourceUrl ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {step.forumCategory ? (
                  <Pressable
                    onPress={() =>
                      router.push(`/(tabs)/forum?category=${step.forumCategory!.slug}` as never)
                    }
                    accessibilityRole="link"
                    hitSlop={4}
                    className="min-h-10 justify-center rounded-full bg-primary/10 px-3 active:opacity-70"
                  >
                    <Text className="text-xs font-bold text-primary">{step.forumCategory.label} →</Text>
                  </Pressable>
                ) : null}
                {step.resourceUrl ? (
                  <Pressable
                    onPress={() => void Linking.openURL(step.resourceUrl!)}
                    accessibilityRole="link"
                    accessibilityLabel={`${step.title} resmî kaynak`}
                    hitSlop={4}
                    className="min-h-10 flex-row items-center gap-1 rounded-full bg-background px-3 active:opacity-70"
                  >
                    <Text className="text-xs font-bold text-muted">Resmî kaynak</Text>
                    <ExternalLink size={12} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <View className="mt-3 items-center rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <MessageCircleQuestion size={28} color={colors.primary} />
        <Text className="mt-2 text-center text-base font-extrabold text-text">
          Listede olmayan bir sorun mu var?
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Forumda sor, deneyimli üyelerden cevap al.
        </Text>
        <Button label="Forumda soru sor" className="mt-4" onPress={() => router.push("/(tabs)/forum/yeni")} />
      </View>
      {done.length > 0 ? (
        <Button
          label="İlerlemeyi sıfırla"
          variant="ghost"
          size="sm"
          className="mt-3 self-center"
          onPress={() =>
            Alert.alert("İlerlemeyi sıfırla", "Tüm işaretler kaldırılacak.", [
              { text: "Vazgeç", style: "cancel" },
              {
                text: "Sıfırla",
                style: "destructive",
                onPress: () => {
                  setDone([]);
                  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
                },
              },
            ])
          }
        />
      ) : null}
      <Text className="mt-4 text-center text-xs leading-5 text-muted">
        Bu liste tavsiye niteliğindedir. Resmî işlemlerde ilgili kurumun güncel bilgisini esas al.
      </Text>
    </Screen>
  );
}
