import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, CircleAlert, Gift, Lock, Mail, UserPlus, UserRound } from "lucide-react-native";

import { AuthDivider, AuthFooterLink, AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  EMPTY_POSTAL_LOCATION,
  PostalLocation,
  PostalLocationErrors,
  PostalLocationFields,
  validatePostalLocation,
} from "@/components/auth/PostalLocationFields";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth";
import { loginWithGoogle } from "@/lib/google-auth";
import { api, ApiError, AuthUser } from "@/lib/api";
import { colors } from "@/lib/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  displayName?: string;
  email?: string;
  password?: string;
  gdpr?: string;
} & PostalLocationErrors;

export default function KayitScreen() {
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(
    typeof ref === "string" ? ref.toUpperCase().slice(0, 12) : "",
  );
  const [location, setLocation] = useState<PostalLocation>(EMPTY_POSTAL_LOCATION);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const referralRef = useRef<TextInput>(null);
  const postalRef = useRef<TextInput>(null);

  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  function validate(): FieldErrors {
    const next: FieldErrors = { ...validatePostalLocation(location) };
    if (displayName.trim().length < 2) next.displayName = "Görünen adını gir (en az 2 karakter).";
    if (!EMAIL_RE.test(email.trim())) next.email = "Geçerli bir e-posta adresi gir.";
    if (password.length < 8) next.password = "Şifre en az 8 karakter olmalı.";
    if (!gdprConsent) next.gdpr = "Devam etmek için KVKK/GDPR onayı gerekli.";
    return next;
  }

  async function handleRegister() {
    if (loading || googleLoading) return;
    setFormError("");
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      const isDe = location.postalCountry === "DE";
      const res = await api.post<{ user: AuthUser; accessToken: string }>("/auth/register", {
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        postalCountry: location.postalCountry,
        postalCode: location.postalCode,
        ...(isDe ? { stateId: location.stateId, cityId: location.cityId } : {}),
        gdprConsent: true,
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
      });
      useAuth.getState().setAuth(res.user, res.accessToken);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Kayıt başarısız. Tekrar dene.";
      if (/e-posta/i.test(message)) setErrors((prev) => ({ ...prev, email: message }));
      else setFormError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    if (loading || googleLoading) return;
    setFormError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result) {
        router.replace({ pathname: "/(auth)/giris", params: { twofa: result.twoFactorTicket } });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0 && /iptal/i.test(err.message)) return;
      setFormError(err instanceof ApiError ? err.message : "Google ile kayıt başarısız.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Hesap oluştur"
      subtitle="Birkaç adımda topluluğa katıl, çevrendeki Türklerle tanış."
      footer={
        <AuthFooterLink
          prompt="Zaten hesabın var mı?"
          label="Giriş yap"
          onPress={() => router.replace("/(auth)/giris")}
        />
      }
    >
      <GoogleSignInButton
        onPress={() => void handleGoogleRegister()}
        loading={googleLoading}
        disabled={loading}
        label="Google ile kayıt ol"
      />

      <AuthDivider label="veya e-posta ile" />

      <TextField
        label="Görünen ad"
        icon={UserRound}
        value={displayName}
        onChangeText={(v) => {
          setDisplayName(v);
          clearError("displayName");
        }}
        placeholder="Adınız Soyadınız"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={errors.displayName}
      />
      <TextField
        ref={emailRef}
        label="E-posta"
        icon={Mail}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearError("email");
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
        error={errors.email}
      />
      <TextField
        ref={passwordRef}
        label="Şifre"
        icon={Lock}
        password
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clearError("password");
        }}
        placeholder="En az 8 karakter"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => referralRef.current?.focus()}
        hint="En az 8 karakter kullan."
        error={errors.password}
      />
      <TextField
        ref={referralRef}
        label="Referans kodu (isteğe bağlı)"
        icon={Gift}
        value={referralCode}
        onChangeText={(v) => setReferralCode(v.toUpperCase().replace(/\s/g, "").slice(0, 12))}
        placeholder="ABC12345"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={12}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => postalRef.current?.focus()}
      />

      <PostalLocationFields
        ref={postalRef}
        value={location}
        onChange={(patch) => {
          setLocation((prev) => ({ ...prev, ...patch }));
          if (patch.postalCode !== undefined) clearError("postalCode");
          if (patch.stateId !== undefined || patch.cityId !== undefined) clearError("location");
        }}
        errors={errors}
        returnKeyType="done"
      />

      <Pressable
        onPress={() => {
          setGdprConsent((v) => !v);
          clearError("gdpr");
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: gdprConsent }}
        accessibilityLabel="Kişisel verilerimin işlenmesine onay veriyorum"
        className={`min-h-11 flex-row items-start gap-3 rounded-2xl border bg-surface p-3.5 active:opacity-70 ${
          errors.gdpr ? "border-danger" : "border-border"
        }`}
      >
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border-2 ${
            gdprConsent ? "border-primary bg-primary" : "border-border bg-surface"
          }`}
        >
          {gdprConsent ? <Check size={13} color={colors.white} strokeWidth={3} /> : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-muted">
          <Text
            className="font-semibold text-primary"
            onPress={() => router.push("/bilgi/gizlilik")}
            accessibilityRole="link"
          >
            Gizlilik politikasını
          </Text>{" "}
          okudum ve kişisel verilerimin işlenmesine onay veriyorum (KVKK/GDPR).
        </Text>
      </Pressable>
      {errors.gdpr ? (
        <Text className="mt-1.5 text-xs font-medium text-danger">{errors.gdpr}</Text>
      ) : null}

      {formError ? (
        <View className="mt-4 flex-row items-center gap-2.5 rounded-2xl bg-danger/10 p-3.5">
          <CircleAlert size={18} color={colors.danger} />
          <Text className="flex-1 text-sm font-medium text-danger">{formError}</Text>
        </View>
      ) : null}

      <Button
        label="Kayıt ol"
        size="lg"
        icon={UserPlus}
        className="mt-6"
        onPress={() => void handleRegister()}
        loading={loading}
        disabled={googleLoading}
      />
    </AuthLayout>
  );
}
