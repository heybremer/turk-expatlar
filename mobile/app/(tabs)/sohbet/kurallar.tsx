import { Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";

import { Screen } from "@/components/ui/Screen";
import { ToolHero } from "@/components/ui/kit";

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "Genel davranış",
    items: [
      "Türk expatlar topluluğuna saygılı, yardımsever ve yapıcı iletişim kurun.",
      "Küfür, hakaret, tehdit, nefret söylemi ve ayrımcılık yasaktır.",
      "Diğer üyelerin kişisel bilgilerini izinsiz paylaşmayın.",
    ],
  },
  {
    title: "Kanallarda yasak paylaşımlar",
    items: [
      "Telefon numarası paylaşımı yasaktır.",
      "Instagram, Facebook, Telegram, WhatsApp link ve kullanıcı adları yasaktır.",
      "Reklam, spam ve aynı mesajı tekrar tekrar göndermek yasaktır.",
    ],
  },
  {
    title: "Otomatik moderasyon",
    items: [
      "Uygunsuz kelimeler otomatik olarak engellenir; mesajınız iletilmez.",
      "İlk ihlalde uyarı alırsınız.",
      "Aynı yasaklı kelimeyi tekrar kullanırsanız 1 saat sohbet yasağı uygulanır.",
      "10 saniyede 8 veya daha fazla mesaj göndermek spam sayılır.",
    ],
  },
  {
    title: "Kanallar ve erişim",
    items: [
      "Genel sohbet herkese açıktır.",
      "Eyalet ve şehir kanalları yalnızca profilinizde kayıtlı bölgeye göre erişilebilir.",
      "Özel mesajlarda isteğe bağlı şifre kullanılabilir; küfür ve hakaret kuralları geçerlidir.",
    ],
  },
  {
    title: "Mesajlar ve gizlilik",
    items: [
      "Bir mesaj en fazla 1000 karakter olabilir; fotoğraf ve sesli mesaj eki en fazla 10 MB'tır.",
      "Kendi mesajınızı gönderdikten sonraki 15 dakika içinde düzenleyebilir, dilediğiniz zaman silebilirsiniz.",
      "Süreli mesajlar seçtiğiniz süre dolunca herkes için otomatik silinir.",
      "Rahatsız eden kullanıcıları özel sohbet menüsünden engelleyebilir veya şikayet edebilirsiniz.",
    ],
  },
  {
    title: "İhlaller",
    items: [
      "Kuralları ihlal eden hesaplar uyarılabilir, geçici veya kalıcı olarak askıya alınabilir.",
      "Tekrarlayan ihlallerde moderasyon ekibi müdahale eder.",
    ],
  },
];

export default function ChatRulesScreen() {
  return (
    <Screen title="Sohbet Kuralları" subtitle="Topluluk standartları ve moderasyon">
      <ToolHero
        icon={ShieldCheck}
        title="Güvenli sohbet"
        subtitle="Kanallar ve özel mesajlar otomatik moderasyon ve manuel denetimle korunur."
      />
      {SECTIONS.map((section, index) => (
        <View key={section.title} className="mb-3 rounded-3xl border border-border bg-surface p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <Text className="text-xs font-extrabold text-primary">{index + 1}</Text>
            </View>
            <Text className="text-base font-bold text-text" accessibilityRole="header">
              {section.title}
            </Text>
          </View>
          {section.items.map((item) => (
            <View key={item} className="mt-1.5 flex-row gap-2">
              <Text className="text-sm text-primary">•</Text>
              <Text className="flex-1 text-sm leading-5 text-muted">{item}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}
