import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, CalendarOff, Compass, Flag, Landmark, Newspaper, Radio } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { fetchPublicSiteSettingsLive } from "@/lib/site-settings";
import { isAppRouteEnabled } from "@/lib/uygulamalar-config";

const APPS = [
  {
    href: "/uygulamalar/eyalet-haberleri",
    icon: <Newspaper className="h-7 w-7 text-primary" />,
    label: "Eyalet Haberleri",
    desc: "Kayıtlı olduğunuz eyaletten güncel haberleri Alman kamu yayıncılarından takip edin.",
    badge: "Güncel",
  },
  {
    href: "/uygulamalar/sehir-haberleri",
    icon: <Building2 className="h-7 w-7 text-accent" />,
    label: "Şehir Haberleri",
    desc: "Şehrinizin belediye duyuruları ve yerel haberler — profilinizdeki şehre göre güncellenir.",
    badge: "Belediye",
  },
  {
    href: "/uygulamalar/etkinlik-takvimi",
    icon: <CalendarDays className="h-7 w-7 text-primary" />,
    label: "Etkinlik Takvimi",
    desc: "Almanya genelinde Türk konser, tiyatro ve kültür etkinliklerini şehre göre filtreleyin.",
    badge: "Konser",
  },
  {
    href: "/uygulamalar/tatil-gunleri",
    icon: <CalendarOff className="h-7 w-7 text-accent" />,
    label: "Tatil Günleri",
    desc: "16 eyalet için resmi tatil günlerini Türkçe açıklamalarla görüntüleyin.",
    badge: "Resmi",
  },
  {
    href: "/uygulamalar/konsolosluklar",
    icon: <Flag className="h-7 w-7 text-primary" />,
    label: "Türk Konsoloslukları",
    desc: "Almanya'daki büyükelçilik ve başkonsoloslukların adres, telefon ve görev bölgeleri.",
    badge: "Resmi",
  },
  {
    href: "/uygulamalar/resmi-kurumlar",
    icon: <Landmark className="h-7 w-7 text-primary" />,
    label: "Almanya Resmi Kurumlar",
    desc: "Yabancılar dairesi, kayıt ofisi, iş ajansı ve diğer resmi kurum rehberi.",
    badge: "Resmi",
  },
  {
    href: "/uygulamalar/gezgin-rehberi",
    icon: <Compass className="h-7 w-7 text-accent" />,
    label: "Gezgin Rehberi",
    desc: "16 eyalet için gezilecek yerler, kısa açıklamalar ve gezi ipuçları.",
    badge: "Keşfet",
  },
  {
    href: "/uygulamalar/yolculuk-telsiz",
    icon: <Radio className="h-7 w-7 text-accent" />,
    label: "Yolculuk Telsiz",
    desc: "Bas-konuş telsiz özelliği ile yoldaki gezginlerle kanal üzerinden canlı sesli iletişim kurun.",
    badge: "Canlı",
  },
];

export default async function UygulamalarPage() {
  const settings = await fetchPublicSiteSettingsLive();
  const visibleApps = APPS.filter((app) => isAppRouteEnabled(settings, app.href));

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Uygulamalar</h1>
        <p className="mt-1 text-sm text-muted">
          Expat yaşamını kolaylaştıran araç ve servisler
        </p>
      </div>

      {visibleApps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          Şu an listelenen uygulama yok. Daha sonra tekrar kontrol edin.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleApps.map((app) => (
            <Link
              key={app.href}
              href={app.href}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:border-primary/50 hover:shadow-md"
            >
              {app.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {app.badge}
                </span>
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8">
                {app.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">{app.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{app.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                Aç <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
