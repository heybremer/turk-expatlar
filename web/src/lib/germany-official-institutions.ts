export type InstitutionCategory =
  | "immigration"
  | "registration"
  | "employment"
  | "social"
  | "health"
  | "tax"
  | "legal"
  | "education"
  | "integration"
  | "emergency";

export type InstitutionScope = "federal" | "state" | "local";

export type OfficialInstitution = {
  id: string;
  name: string;
  nameDe: string;
  category: InstitutionCategory;
  scope: InstitutionScope;
  description: string;
  whenToContact: string;
  phone?: string;
  website: string;
  note?: string;
};

export const INSTITUTION_CATEGORY_LABELS: Record<InstitutionCategory, string> = {
  immigration: "Göç & oturum",
  registration: "Kayıt & nüfus",
  employment: "İş & kariyer",
  social: "Sosyal yardım",
  health: "Sağlık",
  tax: "Vergi",
  legal: "Hukuk & tüketici",
  education: "Eğitim",
  integration: "Entegrasyon",
  emergency: "Acil durum",
};

export const INSTITUTION_SCOPE_LABELS: Record<InstitutionScope, string> = {
  federal: "Federal",
  state: "Eyalet",
  local: "Yerel (belediye)",
};

/** Almanya geneli resmi kurum rehberi — yerel ofisler şehre göre değişir */
export const OFFICIAL_HOTLINES = [
  {
    label: "Almanya’da Çalışma ve Yaşam Danışma Hattı",
    phone: "+49 30 1815111",
    hours: "Pzt–Cum 09:00–15:00 (Türkçe dahil birçok dil)",
    website: "https://www.make-it-in-germany.com/tr/",
  },
  {
    label: "BAMF Entegrasyon Danışma Hattı",
    phone: "+49 30 1815270",
    hours: "Entegrasyon kursu ve vatandaşlık soruları",
    website: "https://www.bamf.de/",
  },
];

export const OFFICIAL_INSTITUTIONS: OfficialInstitution[] = [
  {
    id: "auslaenderbehoerde",
    name: "Yabancılar Dairesi",
    nameDe: "Ausländerbehörde / Ausländeramt",
    category: "immigration",
    scope: "local",
    description:
      "Oturum izni, uzatma, vize değişikliği, aile birleşimi ve ikametle ilgili tüm işlemlerin yapıldığı yerel makam.",
    whenToContact:
      "İlk oturum başvurusu, izin süresi dolmadan uzatma, adres veya statü değişikliği, Fiktionsbescheinigung.",
    website: "https://www.make-it-in-germany.com/tr/visa-residence/living-germany/residence-titles",
    note: "Her şehrin kendi yabancılar dairesi vardır. Google’da “Ausländerbehörde + şehir adınız” arayın veya belediye sitesinden randevu alın.",
  },
  {
    id: "bamf",
    name: "Göç ve Mülteciler Federal Dairesi",
    nameDe: "Bundesamt für Migration und Flüchtlinge (BAMF)",
    category: "immigration",
    scope: "federal",
    description:
      "Entegrasyon kursları, vatandaşlık testi (Einbürgerungstest), bazı ikamet türleri ve tanınma süreçleri.",
    whenToContact: "Entegrasyon kursu (Integrationskurs), LiD testi, vatandaşlık sınavı, göç politika bilgisi.",
    phone: "+49 30 1855350",
    website: "https://www.bamf.de/",
  },
  {
    id: "buergeramt",
    name: "Vatandaşlık / Nüfus Kayıt Ofisi",
    nameDe: "Bürgeramt / Einwohnermeldeamt",
    category: "registration",
    scope: "local",
    description:
      "Anmeldung (adres kaydı), Abmeldung (adres kapatma), Ummeldung (adres değişikliği), Meldebescheinigung.",
    whenToContact:
      "Taşındıktan sonra 14 gün içinde Anmeldung; pasaport/konsolosluk işlemleri için Meldebescheinigung.",
    website: "https://www.make-it-in-germany.com/tr/visa-residence/living-germany/registering-address",
    note: "Berlin’de Bürgeramt, NRW’de Einwohnermeldeamt denir. Randevu çoğu şehirde zorunludur.",
  },
  {
    id: "standesamt",
    name: "Nüfus Müdürlüğü (evlilik/doğum)",
    nameDe: "Standesamt",
    category: "registration",
    scope: "local",
    description: "Evlilik, doğum, ölüm kayıtları; apostil ve resmi belge işlemleri.",
    whenToContact: "Almanya’da evlilik, doğum kaydı, vekaletname onayı (konsoloslukla birlikte).",
    website: "https://www.gesetze-im-internet.de/pstg/",
    note: "Belediyenizin Standesamt birimine başvurun.",
  },
  {
    id: "agentur-arbeit",
    name: "İş Ajansı",
    nameDe: "Agentur für Arbeit",
    category: "employment",
    scope: "local",
    description:
      "İş arama, meslek danışmanlığı, Weiterbildung (mesleki eğitim), Almanca kurs desteği (BAMF ile koordineli).",
    whenToContact: "İş ararken, meslek değişikliği, kısa meslek eğitimi veya işsizlik öncesi danışmanlık.",
    phone: "+49 800 4555500",
    website: "https://www.arbeitsagentur.de/",
    note: "Arbeitslosengeld I için başvuru noktası; Bürgergeld için Jobcenter’a gidilir.",
  },
  {
    id: "zav",
    name: "Yurt Dışı İşe Yerleştirme Merkezi",
    nameDe: "Zentrale Auslands- und Fachvermittlung (ZAV)",
    category: "employment",
    scope: "federal",
    description:
      "Yurt dışından Almanya’ya nitelikli işçi ve meslek vizesi süreçlerinde işveren–çalışan eşleştirmesi.",
    whenToContact: "Almanya dışından iş vizesi, nitelikli meslek onayı süreci.",
    website: "https://www.arbeitsagentur.de/vor-ort/zav/startseite",
  },
  {
    id: "jobcenter",
    name: "Jobcenter (Sosyal İş Merkezi)",
    nameDe: "Jobcenter",
    category: "social",
    scope: "local",
    description: "Bürgergeld (eski Hartz IV), sosyal yardım ve iş bulma desteğinin birleştiği yerel merkez.",
    whenToContact: "İşsizlik yardımı, sosyal güvenlik ağı, mesleki yeniden entegrasyon.",
    phone: "+49 800 4555500",
    website: "https://www.jobcenter.digital/",
    note: "Posta kodunuza göre sorumlu Jobcenter değişir.",
  },
  {
    id: "familienkasse",
    name: "Aile Fonu (Kindergeld)",
    nameDe: "Familienkasse der Bundesagentur für Arbeit",
    category: "social",
    scope: "federal",
    description: "Kindergeld (çocuk parası) başvurusu ve ödemeleri.",
    whenToContact: "Almanya’da ikamet eden ebeveynler çocuk parası başvurusu.",
    website: "https://www.arbeitsagentur.de/familie-und-kinder/kindergeld",
    note: "Başvuru online veya Agentur für Arbeit üzerinden yapılır.",
  },
  {
    id: "rentenversicherung",
    name: "Emeklilik Sigortası",
    nameDe: "Deutsche Rentenversicherung",
    category: "social",
    scope: "federal",
    description: "Emeklilik hakları, birikmiş prim sorgulama, Türkiye–Almanya sosyal güvenlik anlaşması bilgisi.",
    whenToContact: "Emeklilik planı, Versicherungsverlauf (prim dökümü), maluliyet.",
    phone: "+49 800 10004800",
    website: "https://www.deutsche-rentenversicherung.de/",
  },
  {
    id: "finanzamt",
    name: "Vergi Dairesi",
    nameDe: "Finanzamt",
    category: "tax",
    scope: "local",
    description: "Gelir vergisi (Einkommensteuer), vergi numarası (Steuer-ID), serbest meslek ve şirket vergileri.",
    whenToContact: "Steuererklärung (vergi beyanı), Steuer-ID kaybı, ikamet değişikliği bildirimi.",
    website: "https://www.bzst.de/",
    note: "İkamet adresinize göre sorumlu Finanzamt atanır; mektuplarda yazar.",
  },
  {
    id: "gkv",
    name: "Yasal Sağlık Sigortası (GKV)",
    nameDe: "Gesetzliche Krankenversicherung",
    category: "health",
    scope: "federal",
    description:
      "Almanya’da zorunlu sağlık sigortası; AOK, TK, Barmer gibi kasalar eyalet/şehre göre değişir.",
    whenToContact: "İlk Anmeldung sonrası sigorta seçimi; işe başlarken; aile sigortası (Familienversicherung).",
    website: "https://www.gkv-spitzenverband.de/",
    note: "Sigorta kartınız (Gesundheitskarte) doktor randevusu için gereklidir.",
  },
  {
    id: "anerkennung",
    name: "Diploma & Meslek Tanınması",
    nameDe: "Anerkennung in Deutschland",
    category: "education",
    scope: "federal",
    description: "Yurt dışı diploma ve meslek unvanlarının Almanya’da tanınması resmi portalı.",
    whenToContact: "Doktor, hemşire, mühendis, öğretmen vb. mesleklerde çalışma izni öncesi.",
    website: "https://www.anerkennung-in-deutschland.de/html/tr/index.php",
  },
  {
    id: "daad",
    name: "Alman Akademik Değişim Servisi",
    nameDe: "DAAD",
    category: "education",
    scope: "federal",
    description: "Üniversite, araştırma ve burs programları; uluslararası öğrenci rehberliği.",
    whenToContact: "Almanya’da üniversite eğitimi, burs, akademik değişim.",
    website: "https://www.daad.de/tr/",
  },
  {
    id: "integrationskurs",
    name: "Entegrasyon Kursu",
    nameDe: "Integrationskurs (BAMF)",
    category: "integration",
    scope: "federal",
    description: "Almanca (B1) ve Orientierungskurs (LiD); oturum ve vatandaşlık süreçlerinde önemli.",
    whenToContact: "BAMF bildirimi sonrası kursa kayıt; telafi dersleri; sınav (DTZ / LiD).",
    website: "https://www.bamf.de/DE/Themen/Integration/integration_node.html",
    note: "Kurs sağlayıcıları şehre göre değişir; BAMF portalından arayın.",
  },
  {
    id: "verbraucherzentrale",
    name: "Tüketici Danışma Merkezi",
    nameDe: "Verbraucherzentrale",
    category: "legal",
    scope: "state",
    description: "Sözleşme, internet, bankacılık, alışveriş ve tüketici hakları danışmanlığı.",
    whenToContact: "Haksız fatura, abonelik iptali, dolandırıcılık şüphesi.",
    website: "https://www.verbraucherzentrale.de/",
    note: "Her eyaletin kendi Verbraucherzentrale birimi vardır.",
  },
  {
    id: "mieterschutz",
    name: "Kiracı Hakları Derneği",
    nameDe: "Mieterverein / Mieterschutzbund",
    category: "legal",
    scope: "local",
    description: "Kira artışı, depozito, tahliye ve kira sözleşmesi danışmanlığı.",
    whenToContact: "Kira sözleşmesi inceleme, Nebenkostenabrechnung itiraz, Kündigung.",
    website: "https://www.mieterbund.de/",
    note: "Üyelikle hukuki danışmanlık; şehir bazlı Mieterverein arayın.",
  },
  {
    id: "fuehrerscheinstelle",
    name: "Ehliyet / Sürücü Belgesi Ofisi",
    nameDe: "Führerscheinstelle / Fahrerlaubnisbehörde",
    category: "registration",
    scope: "local",
    description: "Türk ehliyetinin tanınması, Almanya ehliyeti, puan (Flensburg) sorgulama.",
    whenToContact: "Ehliyet değişimi, süresi dolan belge, yeni sürücü belgesi.",
    website: "https://www.kba.de/",
    note: "Genelde Landratsamt veya Bürgeramt bünyesinde; eyalete göre değişir.",
  },
  {
    id: "make-it-in-germany",
    name: "Almanya’da Çalış & Yaşa Portalı",
    nameDe: "Make it in Germany",
    category: "employment",
    scope: "federal",
    description: "Federal hükümetin resmi nitelikli göç portalı; vize, iş arama, tanınma rehberleri (Türkçe).",
    whenToContact: "Almanya’ya göç planı, Chancenkarte, Blue Card, iş arama.",
    website: "https://www.make-it-in-germany.com/tr/",
  },
  {
    id: "notfall",
    name: "Acil Numaralar",
    nameDe: "Notruf",
    category: "emergency",
    scope: "federal",
    description: "Polis, itfaiye/ambulans ve genel acil hatlar.",
    whenToContact: "Acil tehlike, kaza, yangın, ciddi suç anı.",
    phone: "112 (itfaiye/ambulans), 110 (polis)",
    website: "https://www.bbk.bund.de/",
    note: "112 tüm AB’de gece gündüz ücretsizdir.",
  },
  {
    id: "zoll",
    name: "Gümrük İdaresi",
    nameDe: "Zoll (Hauptzollamt)",
    category: "tax",
    scope: "federal",
    description: "Türkiye’den eşya getirme, vergi muafiyeti, ticari ithalat ve yolcu eşyası kuralları.",
    whenToContact: "Taşınma eşyası gümrüğü (Umzugsgut), araç ithalatı, yüksek değerli eşya.",
    website: "https://www.zoll.de/",
  },
  {
    id: "schufa",
    name: "Kredi Geçmişi (Schufa)",
    nameDe: "Schufa Holding",
    category: "legal",
    scope: "federal",
    description: "Konut kiralama ve kredi başvurularında kullanılan kredi puanı kaydı.",
    whenToContact: "Ev kiralarken Schufa-Auskunft; hatalı kayıt düzeltme.",
    website: "https://www.meineschufa.de/",
    note: "Yılda bir ücretsiz veri kopyası (Datenkopie) talep edilebilir.",
  },
];

export function telUrl(phone: string) {
  return `tel:${phone.replace(/[\s/()-]/g, "")}`;
}
