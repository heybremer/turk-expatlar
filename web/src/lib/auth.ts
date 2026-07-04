"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./api";
import { disconnectSocket } from "./socket";
import { markSessionIndicatorCookie, markStaffPostLoginRedirect } from "./post-login-redirect";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  profile?: {
    displayName: string;
    avatarUrl?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    postalCode?: string | null;
    postalCountry?: "DE" | "TR" | null;
    allowedPages?: string[];
    state?: { name: string; id: string } | null;
    city?: { name: string; id: string } | null;
    onboardingCompletedAt?: string | null;
    interests?: string[];
  } | null;
  pageAccess?: {
    allowedPages: string[];
    isRestricted: boolean;
  };
  levelProgress?: LevelProgress;
};

export type LevelProgress = {
  level: number;
  points: number;
  maxLevel: number;
  currentLevelPoints: number;
  nextLevelPoints: number | null;
  pointsToNextLevel: number;
  progress: number;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  refreshUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      refreshUser: (user) => set({ user }),
      logout: () => {
        disconnectSocket();
        // HttpOnly + indicator cookie'yi sunucuda temizle
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201"}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        // Indicator cookie'yi client'ta da temizle (sunucu isteği başarısız olsa bile)
        if (typeof document !== "undefined") {
          document.cookie = "s=; path=/; max-age=0; SameSite=Lax";
        }
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: "turk-expatlar-auth" },
  ),
);

export async function login(email: string, password: string) {
  const res = await api.post<{ user: AuthUser; accessToken: string }>(
    "/auth/login",
    { email, password },
  );
  useAuth.getState().setAuth(res.user, res.accessToken);
  markSessionIndicatorCookie();
  if (res.user.role === "ADMIN" || res.user.role === "MODERATOR") {
    markStaffPostLoginRedirect();
  }
  return res;
}

export async function register(data: {
  email: string;
  password: string;
  displayName: string;
  postalCountry: "DE" | "TR";
  stateId?: string;
  cityId?: string;
  postalCode: string;
  gdprConsent: boolean;
  referralCode?: string;
}) {
  const res = await api.post<{ user: AuthUser; accessToken: string }>(
    "/auth/register",
    data,
  );
  useAuth.getState().setAuth(res.user, res.accessToken);
  markSessionIndicatorCookie();
  if (res.user.role === "ADMIN" || res.user.role === "MODERATOR") {
    markStaffPostLoginRedirect();
  }
  return res;
}

/** Client mount sonrası true — localStorage oturumu yüklenene kadar bekler */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
