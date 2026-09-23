import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, ApiError, AuthUser, API_URL } from "./api";
import { useAuth } from "./auth";

WebBrowser.maybeCompleteAuthSession();

/** Expo Go: exp://IP:8081/--/oauth/callback — production build: turkexpatlar://oauth/callback */
const REDIRECT_URI = Linking.createURL("/oauth/callback");

function buildGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    platform: "mobile",
    redirect_uri: REDIRECT_URI,
  });
  return `${API_URL}/auth/google?${params.toString()}`;
}

function readQueryParam(params: Linking.QueryParams | null | undefined, key: string): string | null {
  const value = params?.[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export type GoogleLoginResult = { twoFactorTicket: string } | void;

export async function completeGoogleTwoFactor(ticket: string, code: string): Promise<void> {
  const res = await api.post<{ user: AuthUser; accessToken: string }>("/auth/2fa/google", {
    ticket,
    code,
  });
  useAuth.getState().setAuth(res.user, res.accessToken);
}

export async function completeGoogleOAuthCallback(url: string): Promise<GoogleLoginResult> {
  const parsed = Linking.parse(url);
  const twoFactorTicket = readQueryParam(parsed.queryParams, "twofa");
  if (twoFactorTicket) return { twoFactorTicket };
  const error = readQueryParam(parsed.queryParams, "error");
  if (error) {
    if (error === "oauth_disabled") {
      throw new ApiError("Google ile giriş şu an yapılandırılmamış.", 503);
    }
    throw new ApiError("Google ile giriş başarısız. Lütfen tekrar deneyin.", 401);
  }

  const token = readQueryParam(parsed.queryParams, "token");
  if (!token) {
    throw new ApiError("Google oturum bilgisi alınamadı.", 401);
  }

  const user = await api.get<AuthUser>("/users/me", token);
  useAuth.getState().setAuth(user, token);
}

export async function loginWithGoogle(): Promise<GoogleLoginResult> {
  const result = await WebBrowser.openAuthSessionAsync(buildGoogleAuthUrl(), REDIRECT_URI);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new ApiError("Google ile giriş iptal edildi.", 0);
  }

  if (result.type !== "success") {
    throw new ApiError("Google ile giriş başarısız.", 401);
  }

  return completeGoogleOAuthCallback(result.url);
}
