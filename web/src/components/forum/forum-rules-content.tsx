export type ForumRulesSection = {
  title: string;
  items: string[];
};

export const FORUM_RULES_SECTIONS: ForumRulesSection[] = [
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

export function ForumRulesContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        Forum, Almanya&apos;daki Türkçe konuşan topluluğun soru-cevap ve deneyim paylaşım alanıdır.
        Herkesin güvenle soru sorabilmesi için aşağıdaki kurallara uymanızı rica ederiz.
      </p>
      {FORUM_RULES_SECTIONS.map((section) => (
        <section key={section.title}>
          <h3 className="text-sm font-semibold text-text">{section.title}</h3>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-muted">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
