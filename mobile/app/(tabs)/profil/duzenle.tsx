import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
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
import { avatarUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function ProfilDuzenle() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const profile = user?.profile;
  const fallbackName = (profile?.displayName ?? "").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(
    profile?.firstName ?? fallbackName[0] ?? "",
  );
  const [lastName, setLastName] = useState(
    profile?.lastName ?? fallbackName.slice(1).join(" "),
  );
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [occupation, setOccupation] = useState(profile?.occupation ?? "");
  const [dmEnabled, setDmEnabled] = useState(profile?.dmEnabled ?? true);
  const [postalCode, setPostalCode] = useState(profile?.postalCode ?? "");
  const [stateId, setStateId] = useState(profile?.stateId ?? "");
  const [cityId, setCityId] = useState(profile?.cityId ?? "");
  const [languages, setLanguages] = useState((profile?.languages ?? ["tr"]).join(", "));
  const [interests, setInterests] = useState((profile?.interests ?? []).join(", "));
  const [uploading, setUploading] = useState(false);

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token && profile?.postalCountry === "DE",
  });
  const selectedState = states?.find((state) => state.id === stateId);

  const updateMut = useMutation({
    mutationFn: async () => {
      await api.patch(
        "/users/me/profile",
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          occupation: occupation.trim(),
          dmEnabled,
          postalCode: postalCode.trim(),
          stateId: stateId || undefined,
          cityId: cityId || undefined,
          languages: languages.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
          interests: interests.split(",").map((item) => item.trim()).filter(Boolean),
        },
        token,
      );
      return api.get<AuthUser>("/users/me", token);
    },
    onSuccess: (updatedUser) => {
      refreshUser(updatedUser);
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
      const updated = await api.upload<{ user: typeof user }>(
        "/users/me/avatar",
        asset.uri,
        mimeType,
        `avatar.${ext}`,
        token,
      );
      if (updated.user) refreshUser(updated.user);
    } catch (e) {
      Alert.alert("Hata", e instanceof ApiError ? e.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  const name = profile?.displayName ?? user?.email ?? "?";

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader title="Profili Düzenle" />

      <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        {/* Avatar — kopya ile tutarlı olarak fotoğrafın tamamı dokunulabilir */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => void pickAndUploadAvatar()}
            disabled={uploading}
            activeOpacity={0.8}
            accessibilityLabel="Profil fotoğrafını değiştir"
            className="relative"
          >
            <Avatar name={name} url={profile?.avatarUrl} size="xl" />
            <View className="absolute -bottom-2 -right-2 bg-primary w-9 h-9 rounded-full items-center justify-center border-2 border-surface">
              {uploading ? <Text className="text-white text-base">…</Text> : <Ionicons name="camera" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text className="text-sm text-muted mt-3">Fotoğrafa dokunarak değiştirin</Text>
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">Ad Soyad</Text>
          <View className="flex-row gap-3">
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ad"
              placeholderTextColor="#9ca3af"
              className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 text-text"
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyad"
              placeholderTextColor="#9ca3af"
              className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-4 text-text"
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
          <Text className="mb-1 text-sm font-medium text-text">Telefon</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+49 ..."
            keyboardType="phone-pad"
            placeholderTextColor="#9ca3af"
            className="min-h-12 rounded-xl border border-border bg-surface px-4 text-text"
          />
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-text">Meslek</Text>
          <TextInput
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Örn. Yazılım geliştirici"
            placeholderTextColor="#9ca3af"
            className="min-h-12 rounded-xl border border-border bg-surface px-4 text-text"
          />
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-text">Posta kodu</Text>
          <TextInput
            value={postalCode}
            onChangeText={(value) => setPostalCode(value.replace(/\D/g, "").slice(0, 5))}
            placeholder="12345"
            keyboardType="number-pad"
            maxLength={5}
            placeholderTextColor="#9ca3af"
            className="min-h-12 rounded-xl border border-border bg-surface px-4 text-text"
          />
        </View>

        {profile?.postalCountry === "DE" && states ? (
          <>
            <View>
              <Text className="mb-2 text-sm font-medium text-text">Eyalet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {states.map((state) => (
                  <TouchableOpacity
                    key={state.id}
                    onPress={() => {
                      setStateId(state.id);
                      setCityId("");
                    }}
                    className={`min-h-11 justify-center rounded-full border px-4 ${
                      stateId === state.id ? "border-primary bg-primary" : "border-border bg-surface"
                    }`}
                  >
                    <Text className={stateId === state.id ? "font-semibold text-white" : "text-muted"}>
                      {state.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {selectedState ? (
              <View>
                <Text className="mb-2 text-sm font-medium text-text">Şehir</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {selectedState.cities.map((city) => (
                    <TouchableOpacity
                      key={city.id}
                      onPress={() => setCityId(city.id)}
                      className={`min-h-11 justify-center rounded-full border px-4 ${
                        cityId === city.id ? "border-primary bg-primary" : "border-border bg-surface"
                      }`}
                    >
                      <Text className={cityId === city.id ? "font-semibold text-white" : "text-muted"}>
                        {city.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : null}

        <View>
          <Text className="mb-1 text-sm font-medium text-text">Diller</Text>
          <TextInput
            value={languages}
            onChangeText={setLanguages}
            placeholder="tr, de, en"
            autoCapitalize="none"
            placeholderTextColor="#9ca3af"
            className="min-h-12 rounded-xl border border-border bg-surface px-4 text-text"
          />
          <Text className="mt-1 text-xs text-muted">Virgülle ayır.</Text>
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-text">İlgi alanları</Text>
          <TextInput
            value={interests}
            onChangeText={setInterests}
            placeholder="Etkinlikler, kariyer, seyahat"
            placeholderTextColor="#9ca3af"
            className="min-h-12 rounded-xl border border-border bg-surface px-4 text-text"
          />
          <Text className="mt-1 text-xs text-muted">Virgülle ayır.</Text>
        </View>

        <View>
          <Text className="mb-1 text-sm font-medium text-text">Hakkımda</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Kendinden kısaca bahset"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
            textAlignVertical="top"
            className="min-h-28 rounded-xl border border-border bg-surface p-4 text-text"
          />
          <Text className="mt-1 text-right text-xs text-muted">{bio.length}/500</Text>
        </View>

        <View className="flex-row items-center rounded-xl border border-border bg-surface p-4">
          <View className="flex-1 pr-3">
            <Text className="font-semibold text-text">Özel mesajlar</Text>
            <Text className="mt-1 text-xs text-muted">
              Diğer üyeler sana özel mesaj gönderebilsin.
            </Text>
          </View>
          <Switch
            value={dmEnabled}
            onValueChange={setDmEnabled}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={dmEnabled ? "#0f766e" : "#f3f4f6"}
          />
        </View>

        <Button
          label="Kaydet"
          loading={updateMut.isPending}
          disabled={!firstName.trim() || postalCode.length !== 5}
          onPress={() => updateMut.mutate()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
