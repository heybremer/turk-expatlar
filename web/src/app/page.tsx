import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Compass,
  Eye,
  Flag,
  Landmark,
  Gift,
  HelpCircle,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Plane,
  Sparkles,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { api, type Event, type ForumTopic, type LaunchPromoStats } from "@/lib/api";
import {
  fetchPublicSiteSettingsLive,
  interpolateLaunchText,
  type PublicSiteSettings,
} from "@/lib/site-settings";
import { siteContentClass } from "@/lib/site-layout";
import { isAppRouteEnabled } from "@/lib/uygulamalar-config";
import { formatRelative } from "@/lib/utils";
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

const steps = [
  {
    icon: UserPlus,
    title: "Ücretsiz kayıt ol",
    description: "E-posta veya Google hesabınla bir dakikada üye ol.",
  },
  {
    icon: MapPin,
    title: "Şehrini seç",
    description: "Posta kodunla eyalet ve şehir topluluğuna otomatik katıl.",
  },
  {
    icon: MessagesSquare,
    title: "Topluluğa katıl",
    description: "Soru sor, etkinliklere katıl, sohbet kanallarında tanış.",
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
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 transition-colors group-hover:bg-primary/15">
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

type ListResponse<T> = { items: T[]; total: number };

async function getLaunchPromoStats(): Promise<LaunchPromoStats | null> {
  try {
    return await api.get<LaunchPromoStats>("/subscriptions/promo/launch");
  } catch {
    return null;
  }
}

/** Canlı içerik ve istatistikler — hata halinde bölüm sessizce gizlenir. */
async function getHomeContent() {
  const [topics, events, businesses] = await Promise.all([
    api
      .get<ListResponse<ForumTopic>>("/forum/topics?limit=5", null, 300)
      .catch(() => null),
    api.get<ListResponse<Event>>("/events?limit=4", null, 300).catch(() => null),
    api
      .get<ListResponse<{ id: string }>>("/businesses?limit=1", null, 600)
      .catch(() => null),
  ]);
  return {
    topics: topics?.items ?? [],
    events: events?.items ?? [],
    stats: {
      topics: topics?.total ?? 0,
      events: events?.total ?? 0,
      businesses: businesses?.total ?? 0,
    },
  };
}

const statusStyles: Record<string, string> = {
  SOLVED: "bg-success/10 text-success",
  ANSWERED: "bg-warning/10 text-warning",
  OPEN: "bg-primary/10 text-primary",
  LOCKED: "bg-muted/10 text-muted",
};

const statusLabels: Record<string, string> = {
  SOLVED: "Çözüldü",
  ANSWERED: "Cevaplandı",
  OPEN: "Açık",
  LOCKED: "Kilitli",
};

export default async function HomePage() {
  const [launchPromo, settings, content] = await Promise.all([
    getLaunchPromoStats(),
    fetchPublicSiteSettingsLive(),
    getHomeContent(),
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

  const showTopics = settings.forumEnabled && content.topics.length > 0;
  const showEvents = settings.eventsEnabled && content.events.length > 0;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-24">
        {/* Dekoratif arka plan lekeleri */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-[110%] rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 translate-x-1/3 rounded-full bg-accent/10 blur-3xl"
        />
        <div className={`${siteContentClass} relative text-center`}>
          <BadgeHero />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-text md:text-5xl">
            Almanya&apos;daki Türkçe konuşan{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              topluluğun
            </span>{" "}
            burada
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Şehrindeki etkinlikleri keşfet, sorularına cevap bul, güvenilir işletmelere ulaş.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {settings.registrationEnabled && (
              <Link href="/kayit">
                <Button size="lg">
                  Ücretsiz Katıl
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/rehber">
              <Button variant="outline" size="lg">
                <Store className="mr-1.5 h-4 w-4" />
                İşletmeni Ekle
              </Button>
            </Link>
          </div>

          {/* Canlı topluluk istatistikleri */}
          {(content.stats.topics > 0 ||
            content.stats.events > 0 ||
            content.stats.businesses > 0) && (
            <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface/80 py-4 shadow-sm backdrop-blur">
              <HeroStat value={content.stats.topics} label="Forum konusu" />
              <HeroStat value={content.stats.events} label="Etkinlik" />
              <HeroStat value={content.stats.businesses} label="İşletme" />
            </dl>
          )}
        </div>
      </section>

      {/* ── Öne çıkanlar ── */}
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Toplulukta neler oluyor ── */}
      {(showTopics || showEvents) && (
        <section className="border-t border-border bg-surface py-16">
          <div className={siteContentClass}>
            <h2 className="text-2xl font-bold">Toplulukta neler oluyor?</h2>
            <p className="mt-1 text-sm text-muted">
              Son forum konuları ve yaklaşan etkinliklere göz at
            </p>

            <div
              className={`mt-8 grid gap-8 ${showTopics && showEvents ? "lg:grid-cols-5" : ""}`}
            >
              {showTopics && (
                <div className={showEvents ? "lg:col-span-3" : ""}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      Son Forum Konuları
                    </h3>
                    <Link
                      href="/forum"
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Tümü <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                    {content.topics.map((topic) => (
                      <li key={topic.id}>
                        <Link
                          href={`/forum/${topic.id}`}
                          className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface"
                        >
                          <span
                            className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[topic.status] ?? statusStyles.OPEN}`}
                          >
                            {statusLabels[topic.status] ?? "Açık"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 break-words text-sm font-medium text-text">
                              {topic.title}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                              <span>{topic.category.name}</span>
                              <span className="inline-flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {topic._count?.replies ?? 0}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {topic.viewCount ?? 0}
                              </span>
                              <span>{formatRelative(topic.createdAt)}</span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showEvents && (
                <div className={showTopics ? "lg:col-span-2" : ""}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Calendar className="h-4 w-4 text-accent" />
                      Yaklaşan Etkinlikler
                    </h3>
                    <Link
                      href="/etkinlikler"
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Tümü <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {content.events.map((event) => {
                      const date = new Date(event.startsAt);
                      return (
                        <li key={event.id}>
                          <Link
                            href={`/etkinlikler/${event.id}`}
                            className="flex items-center gap-4 rounded-2xl border border-border bg-background p-3.5 transition-colors hover:border-primary/40 hover:bg-surface"
                          >
                            <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent">
                              <span className="text-base font-bold leading-none">
                                {date.getDate()}
                              </span>
                              <span className="mt-0.5 text-[10px] font-semibold uppercase leading-none">
                                {date.toLocaleDateString("tr-TR", { month: "short" })}
                              </span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1 break-words text-sm font-medium text-text">
                                {event.title}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {event.city.name}
                                  {event.priceType === "FREE" ? " · Ücretsiz" : ""}
                                </span>
                              </span>
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Nasıl çalışır ── */}
      <section className="border-t border-border py-16">
        <div className={siteContentClass}>
          <div className="text-center">
            <h2 className="text-2xl font-bold">Nasıl çalışır?</h2>
            <p className="mt-1 text-sm text-muted">Üç adımda topluluğa katıl</p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute left-1/2 top-0 flex h-6 w-6 -translate-x-8 -translate-y-1.5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          {settings.registrationEnabled && (
            <div className="mt-10 flex justify-center">
              <Link href="/kayit">
                <Button>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Hemen Başla
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Platform ── */}
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

      {/* ── Uygulamalar ── */}
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

function HeroStat({ value, label }: { value: number; label: string }) {
  const formatted = new Intl.NumberFormat("tr-DE").format(value);
  return (
    <div className="flex flex-col px-2 text-center">
      <dt className="order-2 mt-0.5 text-xs text-muted sm:text-sm">{label}</dt>
      <dd className="order-1 text-xl font-bold text-text sm:text-2xl">{formatted}</dd>
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
      <Flag className="h-3.5 w-3.5" />
      Almanya · 16 Eyalet · Şehir Bazlı Topluluk
    </span>
  );
}
