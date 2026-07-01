"use client";

import type { PublicSiteSettings } from "@/lib/site-settings";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth, useAuthHydrated } from "@/lib/auth";

const BYPASS_PREFIXES = ["/admin", "/giris", "/kayit"];

function MaintenanceWrapperInner({
  settings,
  children,
}: {
  settings: PublicSiteSettings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useAuthHydrated();
  const { user, token } = useAuth();

  const bypassed = BYPASS_PREFIXES.some((p) => pathname.startsWith(p));
  const pendingAdminRedirect = searchParams.get("redirect") === "/admin";
  const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR";

  // Admin oturumu yüklenirken bakım ekranı gösterme
  if (
    settings.maintenanceMode &&
    !bypassed &&
    settings.maintenanceAllowAdmins &&
    token &&
    !user &&
    hydrated
  ) {
    return <>{children}</>;
  }

  const active =
    settings.maintenanceMode &&
    !bypassed &&
    !(isStaff && settings.maintenanceAllowAdmins) &&
    !(pendingAdminRedirect && token && isStaff);

  if (!active) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="max-w-lg rounded-2xl border border-border bg-surface p-10">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Bakım modu</p>
        <h1 className="mt-3 text-2xl font-bold">Kısa süreli bakımdayız</h1>
        <p className="mt-3 text-muted">
          {settings.maintenanceMessage ||
            "Sitemiz kısa süreli bakımda. Lütfen biraz sonra tekrar deneyin."}
        </p>
      </div>
    </div>
  );
}

export function MaintenanceWrapper({
  settings,
  children,
}: {
  settings: PublicSiteSettings;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <MaintenanceWrapperInner settings={settings}>{children}</MaintenanceWrapperInner>
    </Suspense>
  );
}
