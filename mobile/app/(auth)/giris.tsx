import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert, Lock, LogIn, Mail, ShieldCheck, Sparkles } from "lucide-react-native";

import { AuthDivider, AuthFooterLink, AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { login } from "@/lib/auth";
import { completeGoogleTwoFactor, loginWithGoogle } from "@/lib/google-auth";
import { ApiError } from "@/lib/api";
import { colors } from "@/lib/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth: "Google ile giriş başarısız. Lütfen tekrar deneyin.",
  oauth_disabled: "Google ile giriş şu an yapılandırılmamış.",
};

function ErrorBanner({ message }: { message: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mb-4 flex-row items-center gap-2.5 rounded-2xl bg-danger/10 p-3.5"
    >
      <CircleAlert size={18} color={colors.danger} />
      <Text className="flex-1 text-sm font-medium text-danger">{message}</Text>
    </View>
  );
}

export default function GirisScreen() {
  const router = useRouter();
  const { error: oauthError, twofa } = useLocalSearchParams<{ error?: string; twofa?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [passwordTwoFactor, setPasswordTwoFactor] = useState(false);
  const [googleTicket, setGoogleTicket] = useState<string | null>(
    typeof twofa === "string" && twofa ? twofa : null,
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState(() =>
    typeof oauthError === "string" && oauthError
      ? OAUTH_ERROR_MESSAGES[oauthError] ?? oauthError
      : "",
  );
  const passwordRef = useRef<TextInput>(null);
  const busyRef = useRef(false);
  const requiresTwoFactor = passwordTwoFactor || !!googleTicket;

  useEffect(() => {
    if (typeof twofa === "string" && twofa) {
      setGoogleTicket(twofa);
      setPasswordTwoFactor(false);
      setCode("");
      setFormError("");
    }
  }, [twofa]);

  useEffect(() => {
    if (typeof oauthError === "string" && oauthError) {
      setFormError(OAUTH_ERROR_MESSAGES[oauthError] ?? oauthError);
    }
  }, [oauthError]);

  function resetTwoFactor() {
    setPasswordTwoFactor(false);
    setGoogleTicket(null);
    setCode("");
    setFormError("");
    if (twofa) router.setParams({ twofa: undefined });
  }

  async function runExclusive(task: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  async function submitTwoFactor(value = code) {
    if (value.length !== 6) {
      setFormError("6 haneli doğrulama kodunu gir.");
      return;
    }
    setFormError("");
    await runExclusive(async () => {
      try {
        if (googleTicket) {
          await completeGoogleTwoFactor(googleTicket, value);
        } else {
          await login(email.trim(), password, value);
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Doğrulama başarısız.";
        setCode("");
        if (googleTicket && /süresi doldu|bilet/i.test(message)) {
          resetTwoFactor();
        }
        setFormError(message);
      }
    });
  }

  async function handleLogin(credentials?: { email: string; password: string }) {
    const loginEmail = (credentials?.email ?? email).trim();
    const loginPassword = credentials?.password ?? password;
    const errors: typeof fieldErrors = {};
    if (!EMAIL_RE.test(loginEmail)) errors.email = "Geçerli bir e-posta adresi gir.";
    if (!loginPassword) errors.password = "Şifreni gir.";
    setFieldErrors(errors);
    setFormError("");
    if (errors.email || errors.password) return;

    await runExclusive(async () => {
      try {
        const result = await login(loginEmail, loginPassword);
        if ("requiresTwoFactor" in result) {
          setPasswordTwoFactor(true);
          setCode("");
        }
      } catch (err) {
        if (__DEV__) {
          console.warn("Login failed", {
            status: err instanceof ApiError ? err.status : undefined,
            message: err instanceof Error ? err.message : String(err),
          });
        }
        setFormError(err instanceof ApiError ? err.message : "Giriş başarısız. Tekrar dene.");
      }
    });
  }

  async function handleGoogleLogin() {
    if (busyRef.current) return;
    setFormError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result) {
        setGoogleTicket(result.twoFactorTicket);
        setCode("");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0 && /iptal/i.test(err.message)) return;
      setFormError(err instanceof ApiError ? err.message : "Google ile giriş başarısız.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout
      icon={requiresTwoFactor ? ShieldCheck : undefined}
      title={requiresTwoFactor ? "Doğrulama kodu" : "Tekrar hoş geldin"}
      subtitle={
        requiresTwoFactor
          ? "Doğrulama uygulamandaki 6 haneli kodu gir."
          : "Almanya'daki Türk topluluğuna giriş yap."
      }
      footer={
        !requiresTwoFactor ? (
          <AuthFooterLink
            prompt="Hesabın yok mu?"
            label="Kayıt ol"
            onPress={() => router.push("/(auth)/kayit")}
          />
        ) : null
      }
    >
      {!requiresTwoFactor ? (
        <>
          {formError ? <ErrorBanner message={formError} /> : null}

          <GoogleSignInButton
            onPress={() => void handleGoogleLogin()}
            loading={googleLoading}
            disabled={loading}
          />

          <AuthDivider label="veya e-posta ile" />

          <TextField
            label="E-posta"
            icon={Mail}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            placeholder="ornek@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={fieldErrors.email}
          />
          <TextField
            ref={passwordRef}
            label="Şifre"
            icon={Lock}
            password
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            placeholder="••••••••"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void handleLogin()}
            error={fieldErrors.password}
          />

          <Pressable
            onPress={() => router.push("/(auth)/sifre-unuttum")}
            accessibilityRole="link"
            hitSlop={8}
            className="-mt-3 mb-3 min-h-11 justify-center self-end"
          >
            <Text className="text-sm font-semibold text-primary">Şifremi unuttum</Text>
          </Pressable>

          <Button
            label="Giriş yap"
            size="lg"
            icon={LogIn}
            onPress={() => void handleLogin()}
            loading={loading}
            disabled={googleLoading}
          />

          {__DEV__ ? (
            <Button
              label="Demo hesapla giriş"
              variant="soft"
              icon={Sparkles}
              className="mt-3"
              onPress={() => {
                setEmail("demo@turkexpatlar.de");
                setPassword("demo1234");
                void handleLogin({ email: "demo@turkexpatlar.de", password: "demo1234" });
              }}
              disabled={loading || googleLoading}
            />
          ) : null}
        </>
      ) : (
        <Card padded={false} className="p-5">
          {formError ? <ErrorBanner message={formError} /> : null}
          <TextInput
            value={code}
            onChangeText={(value) => {
              const next = value.replace(/\D/g, "").slice(0, 6);
              setCode(next);
              if (formError) setFormError("");
              if (next.length === 6) void submitTwoFactor(next);
            }}
            placeholder="000000"
            placeholderTextColor={colors.mutedLight}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={() => void submitTwoFactor()}
            accessibilityLabel="Doğrulama kodu"
            className="mb-5 min-h-16 rounded-2xl border border-border bg-background px-4 text-center text-3xl font-extrabold tracking-[10px] text-text"
          />
          <Button
            label="Doğrula"
            size="lg"
            icon={ShieldCheck}
            onPress={() => void submitTwoFactor()}
            loading={loading}
            disabled={code.length !== 6}
          />
          <Button
            label="Geri dön"
            variant="ghost"
            className="mt-2"
            onPress={resetTwoFactor}
            disabled={loading}
          />
        </Card>
      )}
    </AuthLayout>
  );
}
