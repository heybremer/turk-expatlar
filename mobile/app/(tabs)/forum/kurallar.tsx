import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ban, Flag, type LucideIcon, MessageCircle, Pencil, ShieldCheck, Users } from "lucide-react-native";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { IconTile } from "@/components/ui/kit";

type Section = { title: string; icon: LucideIcon; tint: string; items: string[] };

const FORUM_RULES_SECTIONS: Section[] = [
  {
    title: "Genel davranış",
    icon: Users,
    tint: colors.primary,
    items: [
      "Saygılı, yapıcı ve yardımsever bir dil kullanın.",
      "Küfür, hakaret, tehdit, nefret söylemi ve ayrımcılık yasaktır.",
      "Kişisel bilgileri (telefon, adres, tam ad) izinsiz paylaşmayın.",
    ],
  },
  {
    title: "Konu açarken",
    icon: Pencil,
    tint: colors.primary,
    items: [
      "Başlığı net ve açıklayıcı yazın; tek cümlelik sorular yerine bağlam ekleyin.",
      "Aynı soruyu tekrar sormadan önce arama yapın ve benzer konuları kontrol edin.",
      "Doğru kategoriyi seçin (Resmi İşlemler, Ev Bulma, İş vb.).",
      "Mümkünse eyalet veya şehir bilginizi belirtin; Almanya genelinde kurallar değişebilir.",
    ],
  },
  {
    title: "Yanıtlarken",
    icon: MessageCircle,
    tint: colors.success,
    items: [
      "Deneyime dayalı paylaşım yapın; kesin hukuki veya tıbbi tavsiye vermeyin.",
      "Kaynak veya resmi link eklemeniz teşvik edilir.",
      "Sorun çözüldüyse konuyu “Çözüldü” olarak işaretleyin veya teşekkür edin.",
      "Konu dışı tartışmalardan kaçının.",
    ],
  },
  {
    title: "Yasak içerikler",
    icon: Ban,
    tint: colors.danger,
    items: [
      "Spam, reklam ve sürekli dış link paylaşımı yasaktır.",
      "Sahte bilgi, yanıltıcı iddia ve iftira niteliğinde içerik yasaktır.",
      "Telif hakkı ihlali oluşturan içerik paylaşmayın.",
      "Siyasi propaganda ve konu dışı tartışmalar forum amacına aykırıdır.",
    ],
  },
  {
    title: "Moderasyon ve şikayet",
    icon: Flag,
    tint: colors.warning,
    items: [
      "Kuralları ihlal eden konular kilitlenebilir, düzenlenebilir veya kaldırılabilir.",
      "Tekrarlayan ihlallerde hesap uyarısı, askıya alma veya ban uygulanabilir.",
      "Uygunsuz içerik gördüğünüzde konu veya yanıttaki “Şikayet et” seçeneğini kullanın.",
      "Moderasyon kararlarına saygı gösterin; itiraz için destek formunu kullanın.",
    ],
  },
];

export default function ForumKurallarScreen() {
  const router = useRouter();
  return (
    <Screen title="Forum Kuralları" subtitle="Topluluk standartları ve moderasyon">
      <View className="mb-6 rounded-3xl bg-primary-950 p-6">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <ShieldCheck size={24} color={colors.white} />
        </View>
        <Text className="text-2xl font-extrabold text-white">Güvenli bir topluluk</Text>
        <Text className="mt-2 text-sm leading-5 text-primary-100">
          Forum, Almanya&apos;daki Türkçe konuşan topluluğun soru-cevap ve deneyim paylaşım alanıdır. Herkesin
          güvenle soru sorabilmesi için aşağıdaki kurallara uymanızı rica ederiz.
        </Text>
      </View>

      <View className="gap-3">
        {FORUM_RULES_SECTIONS.map((section) => (
          <Card key={section.title}>
            <View className="mb-3 flex-row items-center gap-3">
              <IconTile icon={section.icon} tint={section.tint} size={40} />
              <Text className="flex-1 text-base font-bold text-text">{section.title}</Text>
            </View>
            <View className="gap-2">
              {section.items.map((item) => (
                <View key={item} className="flex-row gap-2.5">
                  <View className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <Text className="flex-1 text-sm leading-5 text-muted">{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </View>

      <Button
        label="Anladım, konu aç"
        icon={Pencil}
        size="lg"
        className="mt-6 w-full"
        onPress={() => router.replace("/(tabs)/forum/yeni")}
      />
    </Screen>
  );
}
