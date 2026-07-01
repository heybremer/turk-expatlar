"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, useAuthHydrated, type AuthUser } from "@/lib/auth";
import { canAccessPage } from "@/lib/page-permissions";
import type { PostalCountry } from "@/lib/postal-country";

type MeResponse = AuthUser & {
  pageAccess?: {
    allowedPages: string[];
    isRestricted: boolean;
  };
};

const BYPASS_PREFIXES = ["/admin", "/giris", "/kayit"];

export function PageAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const { user, token, refreshUser } = useAuth();
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hydrated || !token || !user) {
      setChecked(true);
      return;
    }

    if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
      setChecked(true);
      return;
    }

    const profileCountry = user.profile?.postalCountry as PostalCountry | undefined;
    if (profileCountry !== "TR" && user.role !== "ADMIN" && user.role !== "MODERATOR") {
      setChecked(true);
      return;
    }

    if (user.pageAccess?.allowedPages?.length) {
      setAllowedPages(user.pageAccess.allowedPages);
      setChecked(true);
      return;
    }

    api
      .get<MeResponse>("/users/me", token)
      .then((me) => {
        if (me.pageAccess?.allowedPages) {
          setAllowedPages(me.pageAccess.allowedPages);
        }
        refreshUser(me);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [hydrated, token, user, pathname, refreshUser]);

  if (!checked) return null;

  const postalCountry = user?.profile?.postalCountry as PostalCountry | undefined;
  const allowed = canAccessPage({
    pathname,
    postalCountry,
    role: user?.role,
    allowedPages,
  });

  if (!user || allowed) return <>{children}</>;

  return (
    <div className="mx-auto w-full max-w-lg py-8 text-center">
      <ShieldAlert className="mx-auto h-12 w-12 text-warning" />
      <h1 className="mt-4 text-xl font-bold">Bu sayfaya erişiminiz yok</h1>
      <p className="mt-2 text-sm text-muted">
        Türkiye posta kodu ile kayıtlı hesabınız bu bölüme erişemiyor. Erişim talebi için
        destek ekibiyle iletişime geçin veya izin verilen sayfalara göz atın.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/seyahat"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Seyahat
        </Link>
        <Link
          href="/profil"
          className="inline-flex rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
        >
          Profilim
        </Link>
      </div>
    </div>
  );
}
