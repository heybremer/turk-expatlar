export type ChatRulesSection = {
  title: string;
  items: string[];
};

export const CHAT_RULES_SECTIONS: ChatRulesSection[] = [
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
    title: "İhlaller",
    items: [
      "Kuralları ihlal eden hesaplar uyarılabilir, geçici veya kalıcı olarak askıya alınabilir.",
      "Tekrarlayan ihlallerde moderasyon ekibi müdahale eder.",
    ],
  },
];

export function ChatRulesContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        Sohbet kanalları ve özel mesajlar, tüm üyeler için güvenli ve saygılı bir ortam sunmak amacıyla
        otomatik moderasyon ve manuel denetimle korunur. Lütfen aşağıdaki kurallara uyun.
      </p>
      {CHAT_RULES_SECTIONS.map((section) => (
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
