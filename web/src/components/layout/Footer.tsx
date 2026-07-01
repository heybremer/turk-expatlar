import type { PublicSiteSettings } from "@/lib/site-settings";
import { siteContentClass } from "@/lib/site-layout";
import Link from "next/link";
import { CookieSettingsButton } from "./CookieSettingsButton";

type FooterProps = {
  settings: PublicSiteSettings;
};

export function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear();
  const copyright =
    settings.footerCopyrightText?.trim() ||
    `${settings.siteName}. Tüm hakları saklıdır.`;

  const socialLinks = [
    settings.instagramUrl && { href: settings.instagramUrl, label: "Instagram" },
    settings.facebookUrl && { href: settings.facebookUrl, label: "Facebook" },
    settings.telegramUrl && { href: settings.telegramUrl, label: "Telegram" },
    settings.whatsappNumber && {
      href: `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`,
      label: "WhatsApp",
    },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="mt-auto border-t border-border bg-surface" suppressHydrationWarning>
      <div className={`${siteContentClass} py-10`} suppressHydrationWarning>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5" suppressHydrationWarning>
          <div suppressHydrationWarning>
            <p className="font-semibold text-primary">{settings.siteName}</p>
            <p className="mt-2 text-sm text-muted">
              {settings.footerTagline ??
                "Almanya'daki Türkçe konuşanlar için güvenilir topluluk platformu."}
            </p>
            {socialLinks.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3 text-sm">
                {socialLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div suppressHydrationWarning>
            <p className="text-sm font-medium">Platform</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {settings.forumEnabled && (
                <li><Link href="/forum" className="hover:text-primary">Forum</Link></li>
              )}
              {settings.eventsEnabled && (
                <li><Link href="/etkinlikler" className="hover:text-primary">Etkinlikler</Link></li>
              )}
              <li><Link href="/rehber" className="hover:text-primary">İşletme Rehberi</Link></li>
              <li><Link href="/isler" className="hover:text-primary">İş İlanları</Link></li>
              <li><Link href="/seyahat" className="hover:text-primary">Seyahat / Eşya</Link></li>
              {settings.registrationEnabled && (
                <li>
                  <Link href="/uyelik" className="font-medium text-primary hover:underline">
                    Üyelik Planları
                  </Link>
                </li>
              )}
            </ul>
          </div>
          <div suppressHydrationWarning>
            <p className="text-sm font-medium">Yasal</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li><Link href="/impressum" className="hover:text-primary">Impressum</Link></li>
              <li><Link href="/gizlilik" className="hover:text-primary">Datenschutz</Link></li>
              <li><Link href="/kullanim" className="hover:text-primary">Kullanım Şartları</Link></li>
              <li><CookieSettingsButton /></li>
            </ul>
          </div>
          <div suppressHydrationWarning>
            <p className="text-sm font-medium">Yardım</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li><Link href="/destek" className="hover:text-primary">Destek Formu</Link></li>
              <li><Link href="/rehber/yeni-gelen" className="hover:text-primary">Yeni Gelen Rehberi</Link></li>
            </ul>
          </div>
          <div suppressHydrationWarning>
            <p className="text-sm font-medium">Şehirler</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li><Link href="/sehir/berlin" className="hover:text-primary">Berlin</Link></li>
              <li><Link href="/sehir/koeln" className="hover:text-primary">Köln</Link></li>
              <li><Link href="/sehir/frankfurt" className="hover:text-primary">Frankfurt</Link></li>
              <li><Link href="/sehir/muenchen" className="hover:text-primary">München</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted">
          © {year} {copyright}
        </p>
      </div>
    </footer>
  );
}
