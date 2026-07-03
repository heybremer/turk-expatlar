import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, AuthUser, FederalState } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DetailHeader } from "@/components/navigation/DetailHeader";

const LANGUAGE_OPTIONS = ["Türkçe", "Almanca", "İngilizce", "Fransızca", "Arapça", "Kürtçe"];

const INTEREST_OPTIONS = [
  "Spor", "Müzik", "Sinema", "Seyahat", "Yemek", "Teknoloji",
  "Girişimcilik", "Eğitim", "Sağlık", "Kültür & Sanat",
];

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function ProfilDuzenle() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const profile = user?.profile;
  const fallbackName = splitDisplayName(profile?.displayName ?? "");
  const [firstName, setFirstName] = useState(profile?.firstName ?? fallbackName.firstName);
  const [lastName, setLastName] = useState(profile?.lastName ?? fallbackName.lastName);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [occupation, setOccupation] = useState(profile?.occupation ?? "");
  const [stateId, setStateId] = useState(profile?.stateId ?? "");
  const [cityId, setCityId] = useState(profile?.cityId ?? "");
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [dmEnabled, setDmEnabled] = useState(profile?.dmEnabled ?? true);
  const [uploading, setUploading] = useState(false);

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
  });
  const selectedState = states?.find((s) => s.id === stateId);

  function toggleMulti(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function refreshMe() {
    try {
      const me = await api.get<AuthUser>("/users/me", token);
      refreshUser(me);
    } catch {
      // ignore — kullanıcı bir dahaki senkronizasyonda güncellenir
    }
  }

  const updateMut = useMutation({
    mutationFn: () =>
      api.patch(
        "/users/me/profile",
        {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          occupation: occupation.trim() || undefined,
          stateId: stateId || undefined,
          cityId: cityId || undefined,
          languages,
          interests,
          dmEnabled,
        },
        token,
      ),
    onSuccess: async () => {
      await refreshMe();
      void qc.invalidateQueries({ queryKey: ["me-stats"] });
      Alert.alert("Başarılı", "Profil güncellendi");
      router.back();
    },
    onError: (e) => Alert.alert("Hata", e instanceof ApiError ? e.message : "Güncellenemedi"),
  });

  async function pickAndUploadAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop() ?? "jpg";
    const mimeType = asset.mimeType ?? `image/${ext}`;

    setUploading(true);
    try {
      await api.upload("/users/me/avatar", asset.uri, mimeType, `avatar.${ext}`, token);
      await refreshMe();
    } catch (e) {
      Alert.alert("Hata", e instanceof ApiError ? e.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  const name = profile?.displayName ?? user?.email ?? "?";
  const hasChanges =
    firstName.trim() !== (profile?.firstName ?? fallbackName.firstName) ||
    lastName.trim() !== (profile?.lastName ?? fallbackName.lastName) ||
    phone.trim() !== (user?.phone ?? "") ||
    bio.trim() !== (profile?.bio ?? "") ||
    occupation.trim() !== (profile?.occupation ?? "") ||
    stateId !== (profile?.stateId ?? "") ||
    cityId !== (profile?.cityId ?? "") ||
    dmEnabled !== (profile?.dmEnabled ?? true) ||
    JSON.stringify(languages) !== JSON.stringify(profile?.languages ?? []) ||
    JSON.stringify(interests) !== JSON.stringify(profile?.interests ?? []);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader title="Profili Düzenle" />

      <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View className="items-center">
          <View className="relative">
            <Avatar name={name} url={profile?.avatarUrl} size="xl" />
            <TouchableOpacity
              onPress={() => void pickAndUploadAvatar()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 bg-primary w-9 h-9 rounded-full items-center justify-center border-2 border-surface"
            >
              {uploading ? <Text className="text-white text-base">…</Text> : <Ionicons name="camera" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-muted mt-3">Fotoğrafa dokunarak değiştirin</Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-text mb-1">Ad</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Adınız"
              placeholderTextColor="#9ca3af"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-text mb-1">Soyad</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyadınız"
              placeholderTextColor="#9ca3af"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text"
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">E-posta</Text>
          <View className="bg-background border border-border rounded-xl px-4 py-3">
            <Text className="text-muted">{user?.email}</Text>
          </View>
          <Text className="text-xs text-muted mt-1">E-posta değiştirilemez</Text>
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">Telefon (ops.)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+49 170 1234567"
            keyboardType="phone-pad"
            placeholderTextColor="#9ca3af"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">Hakkımda (ops.)</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Kendinizden kısaca bahsedin…"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text min-h-[100]"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">Meslek / Sektör (ops.)</Text>
          <TextInput
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Yazılım geliştirici, Öğrenci…"
            placeholderTextColor="#9ca3af"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">Eyalet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {states?.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => { setStateId(s.id); setCityId(""); }}
                className={`rounded-full px-4 py-2 border ${stateId === s.id ? "bg-primary border-primary" : "bg-surface border-border"}`}
              >
                <Text className={`text-sm font-medium ${stateId === s.id ? "text-white" : "text-muted"}`}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedState && (
          <View>
            <Text className="text-sm font-medium text-text mb-2">Şehir</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {selectedState.cities.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCityId(c.id)}
                  className={`rounded-full px-4 py-2 border ${cityId === c.id ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={`text-sm font-medium ${cityId === c.id ? "text-white" : "text-muted"}`}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View>
          <Text className="text-sm font-medium text-text mb-2">Diller</Text>
          <View className="flex-row flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => toggleMulti(languages, setLanguages, l)}
                className={`rounded-full px-3.5 py-2 border ${languages.includes(l) ? "bg-primary/10 border-primary" : "bg-surface border-border"}`}
              >
                <Text className={`text-sm font-medium ${languages.includes(l) ? "text-primary" : "text-muted"}`}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">İlgi Alanları</Text>
          <View className="flex-row flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => toggleMulti(interests, setInterests, i)}
                className={`rounded-full px-3.5 py-2 border ${interests.includes(i) ? "bg-warning/10 border-warning" : "bg-surface border-border"}`}
              >
                <Text className={`text-sm font-medium ${interests.includes(i) ? "text-warning" : "text-muted"}`}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={() => setDmEnabled((v) => !v)} className="flex-row items-center gap-3">
          <View className={`h-5 w-5 rounded border-2 items-center justify-center ${dmEnabled ? "border-primary bg-primary" : "border-border"}`}>
            {dmEnabled && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text className="flex-1 text-sm font-medium text-text">Diğer kullanıcıların bana özel mesaj göndermesine izin ver</Text>
        </TouchableOpacity>

        <Button
          label="Kaydet"
          loading={updateMut.isPending}
          disabled={!firstName.trim() || !hasChanges}
          onPress={() => updateMut.mutate()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
