"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import { needsOnboardingInterests, needsPostalCode } from "@/lib/profile-requirements";

const SKIP_PREFIXES = [
  "/giris",
  "/kayit",
  "/oauth",
  "/profil/duzenle",
  "/hosgeldin",
  "/admin",
];

export function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isAuthenticated } = useAuth();
  const [, setChecked] = useState(false);

  useEffect(() => {
    if (!token || !isAuthenticated()) {
      setChecked(true);
      return;
    }
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    api
      .get<AuthUser>("/users/me", token)
      .then((me) => {
        if (cancelled) return;
        if (me.role === "ADMIN" || me.role === "MODERATOR") {
          return;
        }
        if (needsPostalCode(me)) {
          router.replace("/profil/duzenle?required=postal");
          return;
        }
        if (needsOnboardingInterests(me)) {
          router.replace("/hosgeldin");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, pathname, router]);

  return null;
}
