import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, AuthUser } from "./api";

const secureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore bazen Expo Go'da hata verebilir; sessizce devam et
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  _hasHydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  refreshUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  setHydrated: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      refreshUser: (user) => set({ user }),
      logout: async () => {
        const token = get().token;
        try {
          if (token) {
            await api.delete("/notifications/expo-token", token).catch(() => {});
            await api.post("/auth/logout", {}, token);
          }
        } catch {
          // ignore
        }
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "turk-expatlar-auth",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn("Auth storage hydration failed:", error);
        }
        // Callback state sadece veri içerir; aksiyonlar store üzerinden çağrılmalı
        useAuth.getState().setHydrated();
      },
    },
  ),
);

export async function login(email: string, password: string) {
  const res = await api.post<{ user: AuthUser; accessToken: string }>("/auth/login", {
    email,
    password,
  });
  useAuth.getState().setAuth(res.user, res.accessToken);
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
}) {
  const res = await api.post<{ user: AuthUser; accessToken: string }>("/auth/register", data);
  useAuth.getState().setAuth(res.user, res.accessToken);
  return res;
}
