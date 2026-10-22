import { Alert, TextInput, View } from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Lock, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Screen } from "@/components/ui/Screen";
import { TipBox, ToolHero } from "@/components/ui/kit";

export default function SifreDegistir() {
  const { token } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const changeMut = useMutation({
    mutationFn: () =>
      api.patch<{ message?: string }>("/users/me/password", { currentPassword: current, newPassword: next }, token),
    onSuccess: (res) => {
      Alert.alert("Başarılı", res?.message ?? "Şifre değiştirildi");
      router.back();
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : "Şifre değiştirilemedi"),
  });

  const errors = {
    current: !current ? "Mevcut şifreni gir" : null,
    next: next.length < 8 ? "Şifre en az 8 karakter olmalı" : next === current ? "Yeni şifre mevcut şifreden farklı olmalı" : null,
    confirm: !confirm ? "Yeni şifreyi tekrar gir" : next !== confirm ? "Yeni şifreler eşleşmiyor" : null,
  };

  function handleSubmit() {
    setSubmitted(true);
    setServerError("");
    if (Object.values(errors).some(Boolean) || changeMut.isPending) return;
    changeMut.mutate();
  }

  return (
    <Screen title="Şifre Değiştir" keyboardAware>
      <ToolHero
        icon={ShieldCheck}
        title="Hesabını koru"
        subtitle="Güçlü ve başka yerde kullanmadığın bir şifre seç."
      />

      <Card>
        <TextField
          label="Mevcut şifre"
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            setServerError("");
          }}
          password
          placeholder="••••••••"
          icon={Lock}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nextRef.current?.focus()}
          error={serverError || (submitted ? errors.current : null)}
        />
        <TextField
          ref={nextRef}
          label="Yeni şifre"
          value={next}
          onChangeText={setNext}
          password
          placeholder="••••••••"
          icon={KeyRound}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
          hint="En az 8 karakter"
          error={submitted || next.length > 0 ? errors.next : null}
        />
        <TextField
          ref={confirmRef}
          label="Yeni şifre (tekrar)"
          value={confirm}
          onChangeText={setConfirm}
          password
          placeholder="••••••••"
          icon={KeyRound}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={submitted || confirm.length > 0 ? errors.confirm : null}
          containerClassName="mb-0"
        />
      </Card>

      <Button
        label="Şifreyi Değiştir"
        loading={changeMut.isPending}
        onPress={handleSubmit}
        size="lg"
        className="mt-6"
      />

      <View className="mt-4">
        <TipBox title="İpucu">
          Harf, rakam ve sembolleri birlikte kullanmak şifreni çok daha güvenli yapar. Google ile kayıt olduysan
          şifre değiştirme desteklenmez.
        </TipBox>
      </View>
    </Screen>
  );
}
