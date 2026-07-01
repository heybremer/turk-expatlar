import { useState } from "react";
import {
  Alert,
  Image,
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { avatarUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function ProfilDuzenle() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const profile = user?.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [uploading, setUploading] = useState(false);

  const updateMut = useMutation({
    mutationFn: () => api.patch<{ user: typeof user }>("/users/me/profile", { displayName: displayName.trim() }, token),
    onSuccess: (res) => {
      if (res.user) refreshUser(res.user);
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

        <View>
          <Text className="text-sm font-medium text-text mb-1">Görünen Ad</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Görünen adınız"
            placeholderTextColor="#9ca3af"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-1">E-posta</Text>
          <View className="bg-background border border-border rounded-xl px-4 py-3">
            <Text className="text-muted">{user?.email}</Text>
          </View>
          <Text className="text-xs text-muted mt-1">E-posta değiştirilemez</Text>
        </View>

        <Button
          label="Kaydet"
          loading={updateMut.isPending}
          disabled={!displayName.trim() || displayName.trim() === profile?.displayName}
          onPress={() => updateMut.mutate()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
