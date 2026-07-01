import type { AuthUser } from "@/lib/auth";

/** Profilde geçerli posta kodu yoksa (Google kayıt vb.) */
export function needsPostalCode(user: AuthUser | null | undefined): boolean {
  const code = user?.profile?.postalCode?.trim() ?? "";
  return !/^\d{5}$/.test(code);
}

export function needsOnboardingInterests(user: AuthUser | null | undefined): boolean {
  if (!user?.profile) return false;
  if (needsPostalCode(user)) return false;
  return !user.profile.onboardingCompletedAt;
}
