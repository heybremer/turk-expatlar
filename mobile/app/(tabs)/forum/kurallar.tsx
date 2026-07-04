import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type Section = { title: string; items: string[] };

const FORUM_RULES_SECTIONS: Section[] = [
  {
    title: "Genel davranış",
    items: [
      "Saygılı, yapıcı ve yardımsever bir dil kullanın.",
      "Küfür, hakaret, tehdit, nefret söylemi ve ayrımcılık yasaktır.",
      "Kişisel bilgileri (telefon, adres, tam ad) izinsiz paylaşmayın.",
    ],
  },
  {
    title: "Konu açarken",
    items: [
      "Başlığı net ve açıklayıcı yazın; tek cümlelik sorular yerine bağlam ekleyin.",
      "Aynı soruyu tekrar sormadan önce arama yapın ve benzer konuları kontrol edin.",
      "Doğru kategoriyi seçin (Resmi İşlemler, Ev Bulma, İş vb.).",
      "Mümkünse eyalet veya şehir bilginizi belirtin; Almanya genelinde kurallar değişebilir.",
    ],
  },
  {
    title: "Yanıtlarken",
    items: [
      "Deneyime dayalı paylaşım yapın; kesin hukuki veya tıbbi tavsiye vermeyin.",
      "Kaynak veya resmi link eklemeniz teşvik edilir.",
      "Sorun çözüldüyse konuyu “Çözüldü” olarak işaretleyin veya teşekkür edin.",
      "Konu dışı tartışmalardan kaçının.",
    ],
  },
  {
    title: "Yasak içerikler",
    items: [
      "Spam, reklam ve sürekli dış link paylaşımı yasaktır.",
      "Sahte bilgi, yanıltıcı iddia ve iftira niteliğinde içerik yasaktır.",
      "Telif hakkı ihlali oluşturan içerik paylaşmayın.",
      "Siyasi propaganda ve konu dışı tartışmalar forum amacına aykırıdır.",
    ],
  },
  {
    title: "Moderasyon ve şikayet",
    items: [
      "Kuralları ihlal eden konular kilitlenebilir, düzenlenebilir veya kaldırılabilir.",
      "Tekrarlayan ihlallerde hesap uyarısı, askıya alma veya ban uygulanabilir.",
      "Uygunsuz içerik gördüğünüzde konu veya yanıttaki “Şikayet et” seçeneğini kullanın.",
      "Moderasyon kararlarına saygı gösterin; itiraz için destek formunu kullanın.",
    ],
  },
];

export default function ForumKurallarScreen() {
  return (
    <View className="flex-1 bg-background">
      <DetailHeader title="Forum Kuralları" subtitle="Topluluk standartları ve moderasyon" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons name="document-text-outline" size={20} color="#1a56db" />
          </View>
          <Text className="flex-1 text-sm text-muted leading-5">
            Forum, Almanya&apos;daki Türkçe konuşan topluluğun soru-cevap ve deneyim paylaşım alanıdır. Herkesin
            güvenle soru sorabilmesi için aşağıdaki kurallara uymanızı rica ederiz.
          </Text>
        </View>

        {FORUM_RULES_SECTIONS.map((section) => (
          <View key={section.title} className="mb-5">
            <Text className="text-sm font-semibold text-text mb-2">{section.title}</Text>
            <View className="gap-1.5">
              {section.items.map((item) => (
                <View key={item} className="flex-row gap-2">
                  <Text className="text-sm text-muted">•</Text>
                  <Text className="flex-1 text-sm text-muted leading-5">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
