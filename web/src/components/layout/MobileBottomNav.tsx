"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  HelpCircle,
  Home,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { navLinkAllowed } from "@/lib/page-permissions";
import type { PostalCountry } from "@/lib/postal-country";
import type { PublicSiteSettings } from "@/lib/site-settings";

const ITEMS = [
  { href: "/akis",       label: "Akış",     icon: Home,          feature: null },
  { href: "/forum",      label: "Forum",    icon: HelpCircle,    feature: "forumEnabled" as const },
  { href: "/etkinlikler",label: "Etkinlik", icon: Calendar,      feature: "eventsEnabled" as const },
  { href: "/sohbet",     label: "Sohbet",   icon: MessageCircle, feature: "chatEnabled" as const },
  { href: "/profil",     label: "Profil",   icon: User,          feature: null },
];

const HIDE_PREFIXES = ["/giris", "/kayit", "/hosgeldin", "/admin", "/sohbet"];

type MobileBottomNavProps = {
  settings: PublicSiteSettings;
};

export function MobileBottomNav({ settings }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const items = ITEMS.filter((item) => {
    if (item.feature && settings[item.feature] === false) return false;
    return navLinkAllowed(
      item.href,
      user?.profile?.postalCountry as PostalCountry | undefined,
      user?.role,
      user?.pageAccess?.allowedPages ?? [],
    );
  });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
      aria-label="Alt navigasyon"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]" suppressHydrationWarning>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-3 transition-colors",
                active ? "text-primary" : "text-muted hover:text-text",
              )}
            >
              {/* Aktif göstergesi — üstteki çizgi */}
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary" />
              )}

              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform",
                  active && "scale-110",
                )}
                strokeWidth={active ? 2.5 : 2}
              />

              <span
                className={cn(
                  "truncate text-[11px] font-medium leading-none",
                  active ? "text-primary" : "text-muted",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
