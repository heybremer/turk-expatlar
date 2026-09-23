export type InfoSection = { title: string; body: string };

export const INFO_PAGES: Record<
  string,
  { title: string; subtitle: string; sections: InfoSection[] }
> = {
  hakkinda: {
    title: "Hakkımızda",
    subtitle: "Almanya'daki Türkçe topluluk platformu",
    sections: [
      {
        title: "Neden Türk Expatlar?",
        body: "Türk Expatlar; Almanya'da yaşayan, yeni taşınan veya taşınmayı planlayan insanların güvenilir bilgiye ve birbirine kolayca ulaşması için kuruldu.",
      },
      {
        title: "Topluluk ilkesi",
        body: "Deneyim paylaşımını, saygılı iletişimi ve doğrulanabilir bilgiyi öne çıkarırız. Otomatik hesaplar açıkça etiketlenir.",
      },
      {
        title: "Neler var?",
        body: "Forum, bölgesel sohbet, etkinlikler, Türkçe hizmet rehberi, iş ilanları, seyahat yardımlaşması ve Almanya yaşamına yönelik mini araçlar.",
      },
    ],
  },
  gizlilik: {
    title: "Gizlilik",
    subtitle: "Verileriniz ve haklarınız",
    sections: [
      {
        title: "Toplanan bilgiler",
        body: "Hesap, profil, içerik, cihaz ve güvenlik bilgileri yalnızca platformu çalıştırmak, güvenliği sağlamak ve deneyimi geliştirmek amacıyla işlenir.",
      },
      {
        title: "Kontrol sizde",
        body: "Profil bilgilerinizi değiştirebilir; erişim, düzeltme veya silme taleplerinizi destek formundan iletebilirsiniz.",
      },
      {
        title: "Güvenlik",
        body: "Hassas veriler aktarım sırasında şifrelenir. Şifrenizi kimseyle paylaşmayın ve şüpheli içerikleri bildirin.",
      },
    ],
  },
  kullanim: {
    title: "Kullanım Koşulları",
    subtitle: "Topluluk kuralları ve sorumluluklar",
    sections: [
      {
        title: "Saygılı iletişim",
        body: "Nefret söylemi, taciz, ayrımcılık, tehdit, dolandırıcılık ve yasa dışı içerik yasaktır.",
      },
      {
        title: "Bilgi sorumluluğu",
        body: "Topluluk paylaşımları profesyonel hukuki, tıbbi veya mali danışmanlık değildir. Resmî kaynaklardan doğrulama yapın.",
      },
      {
        title: "İçerik ve hesaplar",
        body: "Yanıltıcı kimlik, spam ve izinsiz reklam kaldırılabilir; ihlal durumunda hesap kısıtlanabilir.",
      },
    ],
  },
  impressum: {
    title: "Impressum",
    subtitle: "Yasal sağlayıcı bilgileri",
    sections: [
      {
        title: "Türk Expatlar",
        body: "Dijital topluluk platformu. Yasal iletişim ve sağlayıcı bilgileri için iletisim@turkexpatlar.de adresini kullanabilirsiniz.",
      },
      {
        title: "Sorumluluk",
        body: "Harici bağlantıların içeriğinden ilgili sağlayıcılar sorumludur. Hukuka aykırı bir içerik fark ederseniz bize bildirin.",
      },
    ],
  },
  iletisim: {
    title: "İletişim",
    subtitle: "Bize ulaşın",
    sections: [
      {
        title: "Destek",
        body: "Teknik sorun, öneri ve özellik istekleri için uygulamadaki Destek formunu kullanın.",
      },
      {
        title: "E-posta",
        body: "Genel iletişim: iletisim@turkexpatlar.de",
      },
      {
        title: "Güvenlik ve içerik",
        body: "Acil içerik bildirimlerinde ilgili mesaj veya kullanıcı üzerindeki Şikâyet Et seçeneğini kullanın.",
      },
    ],
  },
};
