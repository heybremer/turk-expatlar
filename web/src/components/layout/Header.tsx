"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";
import { api, MySubscription } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PublicSiteSettings } from "@/lib/site-settings";
import { siteContentClass } from "@/lib/site-layout";
import { cn } from "@/lib/utils";
import { navLinkAllowed } from "@/lib/page-permissions";
import type { PostalCountry } from "@/lib/postal-country";
import { Button } from "../ui/Button";
import { MessageBell } from "./MessageBell";
import { NotificationBell } from "./NotificationBell";
import { SearchDialog } from "./SearchDialog";
import { ThemeToggle } from "./ThemeToggle";

const ALL_NAV_LINKS = [
  { href: "/akis", label: "Akış", feature: null },
  { href: "/forum", label: "Forum", feature: "forumEnabled" as const },
  { href: "/etkinlikler", label: "Etkinlikler", feature: "eventsEnabled" as const },
  { href: "/rehber", label: "Rehber", feature: null },
  { href: "/isler", label: "İş İlanları", feature: null },
  { href: "/seyahat", label: "Seyahat", feature: null },
  { href: "/sohbet", label: "Sohbet", feature: "chatEnabled" as const },
  { href: "/uygulamalar", label: "Uygulamalar", feature: null },
];

type HeaderProps = {
  settings: PublicSiteSettings;
};

export function Header({ settings }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const navLinks = useMemo(
    () =>
      ALL_NAV_LINKS.filter((link) => {
        if (link.feature && settings[link.feature] === false) return false;
        return navLinkAllowed(
          link.href,
          user?.profile?.postalCountry as PostalCountry | undefined,
          user?.role,
          user?.pageAccess?.allowedPages ?? [],
        );
      }),
    [settings, user],
  );

  useEffect(() => {
    setMounted(true);
    if (token) {
      api
        .get<MySubscription>("/subscriptions/me", token)
        .then((s) => setIsPremium(s.isActive))
        .catch(() => {});
    }
  }, [token]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur" suppressHydrationWarning>
      <div className={siteContentClass} suppressHydrationWarning>
        {/* Üst satır: logo solda, aksiyonlar sağda */}
        <div className="flex h-14 items-center justify-between gap-4" suppressHydrationWarning>
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-primary"
            >
              {settings.logoUrl ? (
                <Image
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg object-cover"
                  priority
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                  <MapPin className="h-4 w-4" />
                </span>
              )}
              <span className="hidden text-base sm:inline">{settings.siteName}</span>
            </Link>
            <SearchDialog />
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2" suppressHydrationWarning>
            {mounted && isAuthenticated() ? (
              <>
                <ThemeToggle />
                <NotificationBell />
                <MessageBell />
                {isPremium && (
                  <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary md:inline-flex">
                    <Sparkles className="h-3 w-3" />
                    Üye
                  </span>
                )}
                <Link
                  href="/profil"
                  className="hidden max-w-[7rem] truncate text-sm text-muted hover:text-text lg:block"
                >
                  {user?.profile?.displayName ?? user?.email}
                </Link>
                {(user?.role === "ADMIN" || user?.role === "MODERATOR") && (
                  <Link
                    href="/admin"
                    className="hidden rounded-lg border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning hover:bg-warning/20 md:block"
                  >
                    Admin
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={logout}>
                  Çıkış
                </Button>
              </>
            ) : (
              <>
                <Link href="/giris">
                  <Button variant="ghost" size="sm">
                    Giriş
                  </Button>
                </Link>
                {settings.registrationEnabled && (
                  <Link href="/uyelik" className="hidden sm:block">
                    <Button size="sm">Üye Ol</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Alt satır: menüler ortada */}
        <nav className="flex justify-center gap-1 overflow-x-auto pb-3 sm:gap-4 md:gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 px-2 py-1 text-sm font-medium transition-colors hover:text-primary sm:px-0",
                pathname.startsWith(link.href)
                  ? "text-primary"
                  : "text-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
