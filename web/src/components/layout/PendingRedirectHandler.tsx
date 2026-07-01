"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth, useAuthHydrated } from "@/lib/auth";
import { resolvePostLoginRedirect, consumeStaffPostLoginRedirect } from "@/lib/post-login-redirect";

function PendingRedirectHandlerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useAuthHydrated();
  const { token, user } = useAuth();

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect?.startsWith("/") || redirect.startsWith("//")) return;
    if (!hydrated || !token || !user) return;

    const target = resolvePostLoginRedirect(user, redirect);
    if (pathname !== target || searchParams.has("redirect")) {
      router.replace(target);
    }
  }, [hydrated, token, user, pathname, searchParams, router]);

  // Giriş sonrası yanlışlıkla /akis'e düşen admin → /admin
  useEffect(() => {
    if (!hydrated || !token || !user) return;
    if (pathname !== "/akis") return;
    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
    if (!isStaff || !consumeStaffPostLoginRedirect()) return;
    router.replace("/admin");
  }, [hydrated, token, user, pathname, router]);

  return null;
}

/** URL'deki ?redirect= parametresini oturum açıkken uygular (ör. /akis?redirect=/admin) */
export function PendingRedirectHandler() {
  return (
    <Suspense fallback={null}>
      <PendingRedirectHandlerInner />
    </Suspense>
  );
}
