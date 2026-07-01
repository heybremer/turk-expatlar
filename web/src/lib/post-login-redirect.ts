import type { AuthUser } from "@/lib/auth";
import { needsOnboardingInterests, needsPostalCode } from "@/lib/profile-requirements";

function safePath(path: string | null | undefined, fallback: string): string {
  if (!path?.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

/** Giriş / OAuth sonrası hedef rota */
export function resolvePostLoginRedirect(
  user: AuthUser,
  redirectTo?: string | null,
): string {
  const explicit = safePath(redirectTo, "/akis");
  if (explicit !== "/akis") {
    return explicit;
  }

  if (user.role === "ADMIN" || user.role === "MODERATOR") {
    return "/admin";
  }

  if (needsPostalCode(user)) {
    return "/profil/duzenle?required=postal";
  }

  if (needsOnboardingInterests(user)) {
    return "/hosgeldin";
  }

  return "/akis";
}

export function markSessionIndicatorCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `s=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function markStaffPostLoginRedirect() {
  if (typeof document === "undefined") return;
  sessionStorage.setItem("staffPostLogin", "1");
}

export function consumeStaffPostLoginRedirect(): boolean {
  if (typeof document === "undefined") return false;
  if (sessionStorage.getItem("staffPostLogin") !== "1") return false;
  sessionStorage.removeItem("staffPostLogin");
  return true;
}
