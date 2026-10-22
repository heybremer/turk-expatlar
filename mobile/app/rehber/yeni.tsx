import { useRef, useState } from "react";
import { Alert, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Languages, MapPin, MessageCircle, Phone, Store } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, IconTile, SectionLabel, TipBox } from "@/components/ui/kit";

type Category = { id: string; name: string; slug: string };

const PHONE_RE = /^\+?[\d\s()/-]{6,}$/;

function isValidUrl(value: string) {
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return u.hostname.includes(".");
  } catch {
    return false;
  }
}

export default function YeniIsletme() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [stateId, setStateId] = useState("");
  const [speaksTurkish, setSpeaksTurkish] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const descRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const whatsappRef = useRef<TextInput>(null);
  const websiteRef = useRef<TextInput>(null);

  const { data: categories } = useQuery({
    queryKey: ["biz-categories"],
    queryFn: () => api.get<Category[]>("/businesses/categories"),
    staleTime: 10 * 60 * 1000,
  });
  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states"),
    staleTime: 60 * 60 * 1000,
  });
  const selectedState = states?.find((s) => s.id === stateId);

  const errors = {
    name: name.trim().length < 2 ? "İşletme adı en az 2 karakter olmalı." : undefined,
    description:
      description.trim().length < 20 ? `Açıklama en az 20 karakter olmalı (${description.trim().length}/20).` : undefined,
    phone: phone.trim() && !PHONE_RE.test(phone.trim()) ? "Geçerli bir telefon numarası girin." : undefined,
    whatsapp: whatsapp.trim() && !PHONE_RE.test(whatsapp.trim()) ? "Geçerli bir numara girin (+49…)." : undefined,
    website: website.trim() && !isValidUrl(website.trim()) ? "Geçerli bir web adresi girin." : undefined,
    categoryId: !categoryId ? "Kategori seçin." : undefined,
    stateId: !stateId ? "Eyalet seçin." : undefined,
    cityId: !cityId ? "Şehir seçin." : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const createMut = useMutation({
    mutationFn: () => {
      const site = website.trim();
      return api.post<{ id: string }>(
        "/businesses",
        {
          name: name.trim(),
          description: description.trim(),
          categoryId,
          stateId,
          cityId,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          website: site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : undefined,
          speaksTurkish,
          languages: speaksTurkish ? ["tr", "de"] : ["de"],
        },
        token,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
      Alert.alert("Kaydın alındı", "İşletmen moderasyon onayından sonra rehberde görünecek.", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 402) {
        Alert.alert("Üyelik gerekli", error.message, [
          { text: "Vazgeç", style: "cancel" },
          { text: "Üyelik planları", onPress: () => router.push("/uyelik" as never) },
        ]);
        return;
      }
      Alert.alert("İşletme eklenemedi", error instanceof Error ? error.message : "Lütfen tekrar deneyin.");
    },
  });

  const submit = () => {
    setSubmitted(true);
    if (hasErrors) return;
    createMut.mutate();
  };

  return (
    <Screen title="İşletme Ekle" subtitle="Rehbere yeni işletme öner" keyboardAware>
      <View className="mb-5">
        <TipBox title="Business üyeliği gerekir">
          İşletme kaydı için aktif Business üyeliği gerekir. Kayıtlar moderasyon onayından sonra yayınlanır.
        </TipBox>
      </View>

      <TextField
        label="İşletme adı"
        icon={Store}
        value={name}
        onChangeText={setName}
        placeholder="örn. Türk Kebap Haus"
        returnKeyType="next"
        onSubmitEditing={() => descRef.current?.focus()}
        submitBehavior="submit"
        maxLength={120}
        error={show("name")}
      />
      <TextField
        ref={descRef}
        label="Açıklama"
        value={description}
        onChangeText={setDescription}
        placeholder="Hizmetleriniz, çalışma saatleriniz…"
        multiline
        maxLength={2000}
        hint="En az 20 karakter"
        error={show("description")}
      />
      <TextField
        ref={addressRef}
        label="Adres"
        hint="İsteğe bağlı"
        icon={MapPin}
        value={address}
        onChangeText={setAddress}
        placeholder="Sokak, No, PLZ Şehir"
        autoComplete="street-address"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={phoneRef}
        label="Telefon"
        hint="İsteğe bağlı"
        icon={Phone}
        value={phone}
        onChangeText={setPhone}
        placeholder="+49 ..."
        keyboardType="phone-pad"
        autoComplete="tel"
        returnKeyType="next"
        onSubmitEditing={() => whatsappRef.current?.focus()}
        submitBehavior="submit"
        error={show("phone")}
      />
      <TextField
        ref={whatsappRef}
        label="WhatsApp"
        hint="İsteğe bağlı"
        icon={MessageCircle}
        value={whatsapp}
        onChangeText={setWhatsapp}
        placeholder="+49 ..."
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => websiteRef.current?.focus()}
        submitBehavior="submit"
        error={show("whatsapp")}
      />
      <TextField
        ref={websiteRef}
        label="Web sitesi"
        hint="İsteğe bağlı"
        icon={Globe}
        value={website}
        onChangeText={setWebsite}
        placeholder="www.ornek.de"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        error={show("website")}
      />

      <SectionLabel>Kategori</SectionLabel>
      <ChipRow
        options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={categoryId}
        onChange={setCategoryId}
      />
      {show("categoryId") ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.categoryId}</Text> : null}

      <SectionLabel>Eyalet</SectionLabel>
      <ChipRow
        options={(states ?? []).map((s) => ({ value: s.id, label: s.name }))}
        value={stateId}
        onChange={(v) => {
          setStateId(v);
          setCityId("");
        }}
      />
      {show("stateId") ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.stateId}</Text> : null}

      {selectedState ? (
        <>
          <SectionLabel>Şehir</SectionLabel>
          <ChipRow
            options={selectedState.cities.map((c) => ({ value: c.id, label: c.name }))}
            value={cityId}
            onChange={setCityId}
          />
          {show("cityId") ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.cityId}</Text> : null}
        </>
      ) : null}

      <Card className="mt-6">
        <View className="flex-row items-center gap-3">
          <IconTile icon={Languages} size={40} />
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-text">Türkçe hizmet veriliyor</Text>
            <Text className="text-xs text-muted">Müşterilere Türkçe hizmet veriliyor</Text>
          </View>
          <Switch
            value={speaksTurkish}
            onValueChange={setSpeaksTurkish}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
            accessibilityLabel="Türkçe hizmet veriliyor"
          />
        </View>
      </Card>

      <Button
        label="İşletmeyi kaydet"
        size="lg"
        className="mt-6"
        loading={createMut.isPending}
        disabled={submitted && hasErrors}
        onPress={submit}
      />
    </Screen>
  );
}
