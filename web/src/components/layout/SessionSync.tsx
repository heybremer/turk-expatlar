"use client";

/**
 * Zustand store'dan gelen token'ı middleware'in okuyabileceği bir
 * indicator cookie ("s=1") ile senkronize eder.
 *
 * Bu sayede eski oturumlar (token localStorage'da) middleware tarafından
 * yanlışlıkla "oturumsuz" olarak algılanmaz.
 */

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const INDICATOR_COOKIE = "s";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 gün (saniye)

export function SessionSync() {
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      // Oturum var → indicator cookie'yi set et
      document.cookie = `${INDICATOR_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    } else {
      // Oturum yok → indicator cookie'yi temizle
      document.cookie = `${INDICATOR_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
  }, [token]);

  return null;
}
