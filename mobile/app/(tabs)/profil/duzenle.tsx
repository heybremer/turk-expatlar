import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, Text, TextInput, View } from "react-native";
import {
  Briefcase,
  Camera,
  CircleCheck,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserRound,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, AuthUser, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Screen } from "@/components/ui/Screen";
import { ChipRow, SectionLabel } from "@/components/ui/kit";

type PlzResult = {
  found: boolean;
  localityName?: string;
  state?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

const LANGUAGE_OPTIONS = ["Türkçe", "Almanca", "İngilizce", "Fransızca", "Arapça", "Kürtçe"];
const INTEREST_OPTIONS = [
  "Spor",
  "Müzik",
  "Sinema",
  "Seyahat",
  "Yemek",
  "Teknoloji",
  "Girişimcilik",
  "Eğitim",
  "Sağlık",
  "Kültür & Sanat",
];
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MultiChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={option}
            className={`min-h-11 justify-center rounded-full border px-4 active:opacity-70 ${
              active ? "border-primary bg-primary" : "border-border bg-surface"
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-white" : "text-muted"}`}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfilDuzenle() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const profile = user?.profile;
  const country = profile?.postalCountry ?? "DE";
  const fallbackName = (profile?.displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(profile?.firstName ?? fallbackName[0] ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? fallbackName.slice(1).join(" "));
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [occupation, setOccupation] = useState(profile?.occupation ?? "");
  const [dmEnabled, setDmEnabled] = useState(profile?.dmEnabled ?? true);
  const [postalCode, setPostalCode] = useState(profile?.postalCode ?? "");
  const [stateId, setStateId] = useState(profile?.stateId ?? "");
  const [cityId, setCityId] = useState(profile?.cityId ?? "");
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [customInterest, setCustomInterest] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [plzStatus, setPlzStatus] = useState<"idle" | "loading" | "found" | "not_found">(
    profile?.postalCode ? "found" : "idle",
  );
  const [plzLabel, setPlzLabel] = useState("");
  const plzTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const occupationRef = useRef<TextInput>(null);
  const postalRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: country === "DE",
    staleTime: 60 * 60 * 1000,
  });
  const selectedState = states?.find((state) => state.id === stateId);

  useEffect(() => () => {
    if (plzTimer.current) clearTimeout(plzTimer.current);
  }, []);

  function handlePostalChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setPostalCode(cleaned);
    setPlzLabel("");
    setPlzStatus("idle");
    if (plzTimer.current) clearTimeout(plzTimer.current);
    if (cleaned.length === 5 && country === "DE") {
      setPlzStatus("loading");
      plzTimer.current = setTimeout(() => void lookupPlz(cleaned), 500);
    }
  }

  async function lookupPlz(code: string) {
    try {
      const res = await api.get<PlzResult>(`/locations/postal/${code}`);
      if (res.found && res.state?.id) {
        setStateId(res.state.id);
        setCityId(res.city?.id ?? "");
        setPlzLabel([res.localityName, res.city?.name, res.state.name].filter(Boolean).join(", "));
        setPlzStatus("found");
      } else {
        setPlzLabel(res.localityName ?? "");
        setPlzStatus("not_found");
      }
    } catch {
      setPlzStatus("not_found");
    }
  }

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) =>
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const addCustomInterest = () => {
    const value = customInterest.trim();
    if (!value) return;
    if (!interests.includes(value)) setInterests([...interests, value]);
    setCustomInterest("");
  };

  const errors = {
    firstName: !firstName.trim() ? "Ad zorunludur" : null,
    email: !EMAIL_RE.test(email.trim()) ? "Geçerli bir e-posta adresi girin" : null,
    phone: phone.trim() && !/^\+?[\d\s()/-]{6,20}$/.test(phone.trim()) ? "Geçerli bir telefon numarası girin" : null,
    postalCode: !/^\d{5}$/.test(postalCode) ? "Posta kodu 5 haneli olmalı" : null,
    state: country === "DE" && states && !stateId ? "Eyalet seçin" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) =>
    submitted || (key === "postalCode" && postalCode.length > 0) ? errors[key] : null;

  const updateMut = useMutation({
    mutationFn: async () => {
      const emailChanged = email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();
      await api.patch(
        "/users/me/profile",
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          ...(emailChanged ? { email: email.trim() } : {}),
          phone: phone.trim(),
          bio: bio.trim(),
          occupation: occupation.trim(),
          dmEnabled,
          postalCode,
          stateId: stateId || undefined,
          cityId: cityId || undefined,
          languages,
          interests,
        },
        token,
      );
      return api.get<AuthUser>("/users/me", token);
    },
    onSuccess: (updatedUser) => {
      refreshUser(updatedUser);
      qc.setQueryData(["me"], updatedUser);
      void qc.invalidateQueries({ queryKey: ["home-feed"] });
      Alert.alert("Başarılı", "Profil güncellendi");
      router.back();
    },
    onError: (e) => Alert.alert("Kaydedilemedi", e instanceof ApiError ? e.message : "Güncellenemedi"),
  });

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors || updateMut.isPending) return;
    updateMut.mutate();
  };

  async function pickAndUploadAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
      Alert.alert("Dosya çok büyük", "Profil fotoğrafı en fazla 5 MB olabilir.");
      return;
    }
    const rawExt = (asset.fileName ?? asset.uri).split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = asset.mimeType && EXT_BY_MIME[asset.mimeType] ? asset.mimeType : MIME_BY_EXT[rawExt] ?? "image/jpeg";
    const ext = EXT_BY_MIME[mimeType] ?? "jpg";

    setUploading(true);
    try {
      await api.upload<{ avatarUrl: string }>("/users/me/avatar", asset.uri, mimeType, `avatar.${ext}`, token);
      const fresh = await api.get<AuthUser>("/users/me", token);
      refreshUser(fresh);
      qc.setQueryData(["me"], fresh);
    } catch (e) {
      Alert.alert("Yükleme başarısız", e instanceof ApiError ? e.message : "Fotoğraf yüklenemedi");
    } finally {
      setUploading(false);
    }
  }

  const name = profile?.displayName ?? user?.email ?? "?";
  const languageOptions = Array.from(new Set([...LANGUAGE_OPTIONS, ...languages]));
  const interestOptions = Array.from(new Set([...INTEREST_OPTIONS, ...interests]));

  return (
    <Screen title="Profili Düzenle" subtitle="Topluluğa kendini tanıt" keyboardAware>
      <Card className="items-center py-6">
        <Pressable
          onPress={() => void pickAndUploadAvatar()}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Profil fotoğrafını değiştir"
          accessibilityState={{ busy: uploading }}
          className="active:opacity-80"
        >
          <Avatar name={name} url={profile?.avatarUrl} size="xl" />
          <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-primary">
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Camera size={16} color={colors.white} />
            )}
          </View>
        </Pressable>
        <Text className="mt-3 text-sm text-muted">
          {uploading ? "Yükleniyor…" : "Fotoğrafa dokunarak değiştirin (en fazla 5 MB)"}
        </Text>
      </Card>

      <SectionLabel>Kişisel bilgiler</SectionLabel>
      <Card>
        <View className="flex-row gap-3">
          <TextField
            label="Ad"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ad"
            icon={UserRound}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            submitBehavior="submit"
            error={show("firstName")}
            containerClassName="flex-1"
          />
          <TextField
            ref={lastNameRef}
            label="Soyad"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Soyad"
            autoCapitalize="words"
            autoComplete="family-name"
            textContentType="familyName"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            submitBehavior="submit"
            containerClassName="flex-1"
          />
        </View>
        <TextField
          ref={emailRef}
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          icon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          submitBehavior="submit"
          error={show("email")}
          hint={user?.emailVerified ? "Doğrulanmış" : "Doğrulanmamış"}
        />
        <TextField
          ref={phoneRef}
          label="Telefon"
          value={phone}
          onChangeText={setPhone}
          placeholder="+49 ..."
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => occupationRef.current?.focus()}
          submitBehavior="submit"
          icon={Phone}
          error={show("phone")}
        />
        <TextField
          ref={occupationRef}
          label="Meslek"
          value={occupation}
          onChangeText={setOccupation}
          placeholder="Örn. Yazılım geliştirici"
          icon={Briefcase}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => postalRef.current?.focus()}
          submitBehavior="submit"
          containerClassName="mb-0"
        />
      </Card>

      <SectionLabel>Konum</SectionLabel>
      <Card>
        <TextField
          ref={postalRef}
          label={country === "TR" ? "Posta kodu (Türkiye)" : "Posta kodu"}
          value={postalCode}
          onChangeText={handlePostalChange}
          placeholder="12345"
          keyboardType="number-pad"
          autoComplete="postal-code"
          textContentType="postalCode"
          maxLength={5}
          icon={MapPin}
          returnKeyType="done"
          error={show("postalCode")}
          hint={
            plzStatus === "loading"
              ? "Posta kodu aranıyor…"
              : plzStatus === "found" && plzLabel
                ? plzLabel
                : plzStatus === "not_found"
                  ? "Otomatik bulunamadı, eyalet ve şehri aşağıdan seçin."
                  : undefined
          }
          containerClassName={country === "DE" && states ? "" : "mb-0"}
        />
        {plzStatus === "found" && plzLabel ? (
          <View className="-mt-2 mb-3 flex-row items-center gap-1.5">
            <CircleCheck size={14} color={colors.success} />
            <Text className="text-xs font-semibold text-success">Konum otomatik dolduruldu</Text>
          </View>
        ) : null}
        {country === "DE" && states ? (
          <>
            <Text className="mb-2 text-sm font-semibold text-text">Eyalet</Text>
            <ChipRow
              options={states.map((state) => ({ value: state.id, label: state.name }))}
              value={stateId}
              onChange={(value) => {
                setStateId(value);
                setCityId("");
              }}
            />
            {show("state") ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.state}</Text> : null}
            {selectedState?.cities?.length ? (
              <>
                <Text className="mb-2 mt-4 text-sm font-semibold text-text">Şehir</Text>
                <ChipRow
                  options={selectedState.cities.map((city) => ({ value: city.id, label: city.name }))}
                  value={cityId}
                  onChange={setCityId}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Card>

      <SectionLabel>Konuştuğun diller</SectionLabel>
      <MultiChips
        options={languageOptions}
        selected={languages}
        onToggle={(v) => toggle(languages, setLanguages, v)}
      />

      <SectionLabel>İlgi alanları</SectionLabel>
      <MultiChips
        options={interestOptions}
        selected={interests}
        onToggle={(v) => toggle(interests, setInterests, v)}
      />
      <View className="mt-3 flex-row items-start gap-2">
        <TextField
          value={customInterest}
          onChangeText={setCustomInterest}
          placeholder="Başka bir ilgi alanı ekle"
          accessibilityLabel="Yeni ilgi alanı"
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={addCustomInterest}
          maxLength={40}
          containerClassName="mb-0 flex-1"
        />
        <Pressable
          onPress={addCustomInterest}
          disabled={!customInterest.trim()}
          accessibilityRole="button"
          accessibilityLabel="İlgi alanı ekle"
          className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 active:opacity-70"
          style={{ opacity: customInterest.trim() ? 1 : 0.5 }}
        >
          <Plus size={20} color={colors.primary} />
        </Pressable>
      </View>

      <SectionLabel>Hakkında</SectionLabel>
      <Card>
        <TextField
          ref={bioRef}
          label="Hakkımda"
          value={bio}
          onChangeText={setBio}
          placeholder="Kendinden kısaca bahset"
          multiline
          maxLength={500}
          icon={Hash}
          hint={`${bio.length}/500`}
          containerClassName="mb-0"
        />
      </Card>

      <SectionLabel>Gizlilik</SectionLabel>
      <Card className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Lock size={18} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-text">Özel mesajlar</Text>
          <Text className="mt-0.5 text-xs text-muted">Diğer üyeler sana özel mesaj gönderebilsin.</Text>
        </View>
        <Switch
          value={dmEnabled}
          onValueChange={setDmEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
          accessibilityLabel="Özel mesajlar"
        />
      </Card>

      {submitted && hasErrors ? (
        <Text className="mt-4 text-center text-sm font-medium text-danger">Lütfen işaretli alanları düzeltin.</Text>
      ) : null}

      <Button
        label="Kaydet"
        loading={updateMut.isPending}
        disabled={uploading}
        onPress={handleSave}
        size="lg"
        className="mt-6"
      />
    </Screen>
  );
}
