import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CalendarOff,
  Compass,
  Flag,
  Landmark,
  Gift,
  HelpCircle,
  MapPin,
  MessageCircle,
  Newspaper,
  Plane,
  Sparkles,
  Users,
} from "lucide-react";
import { api, type LaunchPromoStats } from "@/lib/api";
import {
  fetchPublicSiteSettingsLive,
  interpolateLaunchText,
  type PublicSiteSettings,
} from "@/lib/site-settings";
import { siteContentClass } from "@/lib/site-layout";
import { isAppRouteEnabled } from "@/lib/uygulamalar-config";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Users,
    title: "Şehrindeki insanlarla tanış",
    description: "Eyalet ve şehir bazlı topluluklarla çevreni genişlet.",
  },
  {
    icon: Calendar,
    title: "Etkinliklere katıl",
    description: "Kahvaltı, networking, dil değişimi ve daha fazlası.",
  },
  {
    icon: HelpCircle,
    title: "Sorularına cevap bul",
    description: "Anmeldung, oturum, iş, ev — çözümlenen konu arşivi.",
  },
  {
    icon: MapPin,
    title: "Güvenilir işletmeler",
    description: "Türkçe hizmet veren doktor, avukat, tercüman ve daha fazlası.",
  },
];

const platformLinks = [
  {
    href: "/forum",
    icon: <HelpCircle className="h-7 w-7 text-primary" />,
    label: "Forum",
    desc: "Sorularını sor, deneyimlerini paylaş, çözümlere ulaş.",
  },
  {
    href: "/etkinlikler",
    icon: <Calendar className="h-7 w-7 text-accent" />,
    label: "Etkinlikler",
    desc: "Şehrindeki buluşmalara katıl veya kendi etkinliğini oluştur.",
  },
  {
    href: "/rehber",
    icon: <MapPin className="h-7 w-7 text-primary" />,
    label: "Rehber",
    desc: "Türkçe hizmet veren güvenilir işletmeleri keşfet.",
  },
  {
    href: "/isler",
    icon: <Briefcase className="h-7 w-7 text-accent" />,
    label: "İş İlanları",
    desc: "İşveren ve iş arayan ilanları — kariyer fırsatları.",
  },
  {
    href: "/seyahat",
    icon: <Plane className="h-7 w-7 text-primary" />,
    label: "Seyahat",
    desc: "Türkiye–Almanya arası eşya taşıma talepleri ve eşleşmeler.",
  },
  {
    href: "/sohbet",
    icon: <MessageCircle className="h-7 w-7 text-accent" />,
    label: "Sohbet",
    desc: "Eyalet, şehir ve etkinlik kanallarında canlı sohbet.",
  },
];

const appLinks = [
  {
    href: "/uygulamalar/eyalet-haberleri",
    icon: <Newspaper className="h-7 w-7 text-primary" />,
    label: "Eyalet Haberleri",
    desc: "Eyaletinizden güncel haberler.",
    badge: "Güncel",
  },
  {
    href: "/uygulamalar/sehir-haberleri",
    icon: <Building2 className="h-7 w-7 text-accent" />,
    label: "Şehir Haberleri",
    desc: "Belediye ve yerel haberler.",
    badge: "Belediye",
  },
  {
    href: "/uygulamalar/etkinlik-takvimi",
    icon: <CalendarDays className="h-7 w-7 text-primary" />,
    label: "Etkinlik Takvimi",
    desc: "Almanya'daki Türk konser ve kültür etkinlikleri.",
    badge: "Konser",
  },
  {
    href: "/uygulamalar/tatil-gunleri",
    icon: <CalendarOff className="h-7 w-7 text-accent" />,
    label: "Tatil Günleri",
    desc: "Eyalete göre resmi tatil günleri.",
    badge: "Resmi",
  },
  {
    href: "/uygulamalar/konsolosluklar",
    icon: <Flag className="h-7 w-7 text-primary" />,
    label: "Türk Konsoloslukları",
    desc: "Adres ve telefon rehberi.",
    badge: "Resmi",
  },
  {
    href: "/uygulamalar/resmi-kurumlar",
    icon: <Landmark className="h-7 w-7 text-primary" />,
    label: "Resmi Kurumlar",
    desc: "Yabancılar dairesi, Bürgeramt vb.",
    badge: "Resmi",
  },
  {
    href: "/uygulamalar/gezgin-rehberi",
    icon: <Compass className="h-7 w-7 text-accent" />,
    label: "Gezgin Rehberi",
    desc: "Eyalete göre gezilecek yerler.",
    badge: "Keşfet",
  },
];

function GridCard({
  href,
  icon,
  label,
  desc,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:border-primary/50 hover:shadow-md"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-text">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        Aç <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

async function getLaunchPromoStats(): Promise<LaunchPromoStats | null> {
  try {
    return await api.get<LaunchPromoStats>("/subscriptions/promo/launch");
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [launchPromo, settings] = await Promise.all([
    getLaunchPromoStats(),
    fetchPublicSiteSettingsLive(),
  ]);
  const launchRemaining = launchPromo?.remaining ?? 100;
  const launchAvailable = launchPromo?.available ?? true;

  const launchVars = {
    remaining: launchRemaining,
    price: settings.userMembershipPriceEur,
    userPrice: settings.userMembershipPriceEur,
    businessPrice: settings.businessMembershipPriceEur,
    promoCode: settings.launchPromoCode ?? "LAUNCH100",
  };

  const visiblePlatformLinks = platformLinks.filter((item) => {
    if (item.href === "/forum") return settings.forumEnabled;
    if (item.href === "/etkinlikler") return settings.eventsEnabled;
    if (item.href === "/sohbet") return settings.chatEnabled;
    return true;
  });

  const visibleAppLinks = appLinks.filter((item) => isAppRouteEnabled(settings, item.href));

  return (
    <div>
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className={`${siteContentClass} text-center`}>
          <BadgeHero />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-text md:text-5xl">
            Almanya&apos;daki Türkçe konuşan topluluğun burada
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Şehrindeki etkinlikleri keşfet, sorularına cevap bul, güvenilir işletmelere ulaş.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {settings.registrationEnabled && (
              <Link href="/kayit">
                <Button size="lg">Ücretsiz Katıl</Button>
              </Link>
            )}
            <Link href="/rehber">
              <Button variant="outline" size="lg">
                İşletmeni Ekle
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-background py-16">
        <div className={siteContentClass}>
          <h2 className="text-2xl font-bold">Platform</h2>
          <p className="mt-1 text-sm text-muted">
            Forum, etkinlikler, rehber ve daha fazlasına tek yerden ulaş
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePlatformLinks.map((item) => (
              <GridCard key={item.href} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className={siteContentClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Uygulamalar</h2>
              <p className="mt-1 text-sm text-muted">
                Haberler, etkinlik takvimi, tatil günleri ve pratik araçlar
              </p>
            </div>
            <Link
              href="/uygulamalar"
              className="text-sm font-medium text-primary hover:underline"
            >
              Tüm uygulamalar →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleAppLinks.map((item) => (
              <GridCard key={item.href} {...item} />
            ))}
          </div>
        </div>
      </section>

      <LaunchSection
        settings={settings}
        launchAvailable={launchAvailable}
        launchRemaining={launchRemaining}
        launchVars={launchVars}
      />
    </div>
  );
}

function LaunchSection({
  settings,
  launchAvailable,
  launchRemaining,
  launchVars,
}: {
  settings: PublicSiteSettings;
  launchAvailable: boolean;
  launchRemaining: number;
  launchVars: Record<string, string | number>;
}) {
  const badgeTemplate = launchAvailable
    ? settings.launchBadgeText ?? "Lansman — Son {remaining} kişi ücretsiz"
    : "Lansman kodu doldu";

  const headline = launchAvailable
    ? interpolateLaunchText(settings.launchHeadline, launchVars) ||
      `Yıllık sadece ${settings.userMembershipPriceEur} € — ya da davet kodunla ücretsiz`
    : `Üyelik ${settings.userMembershipPriceEur} €/yıl — işletmeler ${settings.businessMembershipPriceEur} €/yıl`;

  const description = launchAvailable
    ? interpolateLaunchText(settings.launchDescription, launchVars) ||
      `Kullanıcı üyeliği: ${settings.userMembershipPriceEur} €/yıl · İşletme üyeliği: ${settings.businessMembershipPriceEur} €/yıl · ${launchVars.promoCode} kodu ile kalan ${launchRemaining} ücretsiz üyelik hakkı.`
    : `Lansman promosyonu (${settings.launchPromoCode ?? "LAUNCH100"}) sona erdi. Standart yıllık ücretler geçerlidir; davet kodunla veya doğrudan üye olabilirsin.`;

  return (
    <section className="border-t border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-14">
      <div className={`${siteContentClass} text-center`}>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Gift className="h-3.5 w-3.5" />
            {launchAvailable
              ? interpolateLaunchText(badgeTemplate, launchVars)
              : badgeTemplate}
          </span>
        </div>
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{headline}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">{description}</p>
        {settings.registrationEnabled && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/uyelik">
              <Button size="lg">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Planları gör
              </Button>
            </Link>
            <Link href="/uyelik">
              <Button variant="outline" size="lg">
                Promo kodum var
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function BadgeHero() {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
      Almanya · 16 Eyalet · Şehir Bazlı Topluluk
    </span>
  );
}
