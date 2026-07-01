import Link from "next/link";
import {
  Banknote,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  CreditCard,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  Phone,
} from "lucide-react";

export const metadata = {
  title: "Yeni Gelen Rehberi",
  description:
    "Almanya'ya yeni geldiyseniz adım adım yapmanız gerekenler: Anmeldung, banka, sağlık sigortası, vergi numarası ve daha fazlası.",
};

type Step = {
  icon: React.ElementType;
  title: string;
  description: string;
  link?: { href: string; label: string };
  resourceUrl?: string;
};

const steps: Step[] = [
  {
    icon: Home,
    title: "Anmeldung (Adres Kaydı)",
    description:
      "Almanya'da bir adrese taşındıktan sonra 14 gün içinde Bürgeramt'ta adres kaydı yaptırmalısın. Çoğu işlem için bu belge ön şart.",
    link: { href: "/forum?category=resmi-islemler", label: "Forum'da deneyimleri oku" },
    resourceUrl: "https://service.berlin.de/dienstleistung/120686/",
  },
  {
    icon: Banknote,
    title: "Banka Hesabı",
    description:
      "N26, DKB, Commerzbank gibi seçenekler. Anmeldung olmadan açabileceğin online bankalar da var.",
    link: { href: "/forum?category=is-bulma", label: "Önerileri gör" },
  },
  {
    icon: Phone,
    title: "SIM Kart / Mobil Hat",
    description:
      "Prepaid (Aldi Talk, Lidl Connect) hızlı başlangıç. Sözleşmeli hatlar Anmeldung ve banka hesabı ister.",
  },
  {
    icon: HeartPulse,
    title: "Krankenkasse (Sağlık Sigortası)",
    description:
      "Almanya'da zorunludur. TK, AOK, Barmer en yaygın gesetzliche Krankenkasse'ler.",
    link: { href: "/forum?category=saglik", label: "Sağlık forumuna git" },
  },
  {
    icon: IdCard,
    title: "Steueridentifikationsnummer (Vergi No)",
    description:
      "Anmeldung sonrası 2-4 hafta içinde otomatik posta ile gelir. İş başlamadan önce işverene verilir.",
    link: { href: "/forum?category=vergi", label: "Vergi soruları" },
  },
  {
    icon: Building2,
    title: "Oturum İzni / Aufenthaltstitel",
    description:
      "AB dışından geliyorsan Ausländerbehörde'de oturum başvurusu yapman gerekir. Randevuyu önceden al.",
    link: { href: "/forum?category=resmi-islemler", label: "Konuya git" },
  },
  {
    icon: Briefcase,
    title: "İş Bulma",
    description:
      "LinkedIn, StepStone, Indeed, Make-it-in-Germany; Türk işverenler için topluluk önerileri.",
    link: { href: "/forum?category=is-bulma", label: "İş forumuna git" },
  },
  {
    icon: GraduationCap,
    title: "Almanca Kursu",
    description:
      "Volkshochschule (VHS) uygun fiyatlı. Goethe Institut sertifikalı sınavlar için.",
    link: { href: "/forum?category=almanca", label: "Almanca forumu" },
  },
  {
    icon: Home,
    title: "Ev Arama",
    description:
      "ImmoScout24, WG-Gesucht, Immowelt. Schufa raporu ve maaş bordrosu istenir.",
    link: { href: "/forum?category=ev-bulma", label: "Ev forumu" },
  },
  {
    icon: CreditCard,
    title: "Rundfunkbeitrag (TV/Radyo Ücreti)",
    description:
      "Anmeldung sonrası otomatik gelir. Hane başına aylık yaklaşık 18.36 €.",
  },
  {
    icon: Car,
    title: "Ehliyet Değişimi",
    description:
      "Türk ehliyeti Almanya'da en fazla 6 ay geçerli; sonra Almanca ehliyete çevrilmesi gerekir.",
  },
  {
    icon: Globe,
    title: "Uluslararası Posta",
    description:
      "Deutsche Post, DHL en yaygın. Türkiye'ye paket için PTT Almanya hizmetleri.",
  },
];

export default function YeniGelenRehberPage() {
  return (
    <div className="w-full min-w-0">
      <p className="text-sm text-primary">Yeni Gelen Rehberi</p>
      <h1 className="mt-1 text-3xl font-bold">
        Almanya&apos;ya yeni geldiysen, şu adımları sırayla yap
      </h1>
      <p className="mt-3 text-muted">
        Bu liste tavsiye niteliğindedir. Resmi işlemlerde mutlaka ilgili kurumun
        güncel bilgisini ve gerekirse uzman görüşünü al.
      </p>

      <div className="mt-8 space-y-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted">
                    Adım {i + 1}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted" />
                </div>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {step.link && (
                    <Link
                      href={step.link.href}
                      className="text-primary hover:underline"
                    >
                      {step.link.label} →
                    </Link>
                  )}
                  {step.resourceUrl && (
                    <a
                      href={step.resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted hover:text-text"
                    >
                      Resmi kaynak ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-semibold">Listede olmayan bir sorun mu var?</h3>
        <p className="mt-2 text-sm text-muted">
          Forum&apos;da sor — yaşayan deneyimlerden cevap al.
        </p>
        <Link
          href="/forum/yeni"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Forum&apos;da soru sor
        </Link>
      </div>
    </div>
  );
}
