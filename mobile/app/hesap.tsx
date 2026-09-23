import { useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type BlockedUser = {
  id: string;
  profile: { displayName: string; avatarUrl?: string | null } | null;
  blockedAt: string;
};

const DELETE_CONFIRM_WORD = "SİL";

export default function AccountScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuth((state) => state.token);
  const logout = useAuth((state) => state.logout);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const blocked = useQuery({
    queryKey: ["blocked-users"],
    queryFn: () => api.get<BlockedUser[]>("/users/blocked", token),
    enabled: !!token,
  });

  const unblock = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}/block`, token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["blocked-users"] }),
    onError: (err) =>
      Alert.alert("İşlem başarısız", err instanceof ApiError ? err.message : "Engel kaldırılamadı."),
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete("/users/me", token),
    onSuccess: async () => {
      await logout();
      router.replace("/(auth)/giris");
    },
    onError: (err) =>
      setDeleteError(err instanceof ApiError ? err.message : "Hesap silinemedi. Tekrar dene."),
  });

  const confirmDelete = () => {
    setDeleteError("");
    Alert.alert(
      "Hesabı kalıcı olarak sil",
      "Profil bilgilerin anonimleştirilir ve bu hesapla tekrar giriş yapamazsın. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Hesabı sil", style: "destructive", onPress: () => deleteAccount.mutate() },
      ],
    );
  };

  const canDelete =
    confirmText.trim().toLocaleUpperCase("tr-TR") === DELETE_CONFIRM_WORD && !deleteAccount.isPending;

  return (
    <Screen title="Hesap ve Gizlilik" subtitle="Engellenen kullanıcılar ve hesap silme" keyboardAware>
      <Text className="mb-3 text-base font-bold text-text">Engellenen kullanıcılar</Text>
      {blocked.isLoading ? (
        <ActivityIndicator className="my-6" />
      ) : blocked.isError ? (
        <ErrorState title="Liste yüklenemedi" onRetry={() => void blocked.refetch()} />
      ) : !blocked.data?.length ? (
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-muted">Engellediğin kullanıcı yok.</Text>
        </View>
      ) : (
        <View className="gap-3">
          {blocked.data.map((entry) => {
            const name = entry.profile?.displayName ?? "Kullanıcı";
            const pending = unblock.isPending && unblock.variables === entry.id;
            return (
              <View
                key={entry.id}
                className="flex-row items-center rounded-2xl border border-border bg-surface p-4"
              >
                <Avatar name={name} url={entry.profile?.avatarUrl} size="md" />
                <Text className="ml-3 flex-1 font-semibold text-text" numberOfLines={1}>
                  {name}
                </Text>
                <TouchableOpacity
                  onPress={() => unblock.mutate(entry.id)}
                  disabled={pending}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} engelini kaldır`}
                  className="min-h-11 justify-center rounded-xl border border-border px-3"
                >
                  {pending ? (
                    <ActivityIndicator />
                  ) : (
                    <Text className="font-semibold text-primary">Engeli kaldır</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <View className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5">
        <Text className="text-lg font-bold text-red-800">Hesabı sil</Text>
        <Text className="mt-2 leading-6 text-red-700">
          Hesabın kapatılır; ad, fotoğraf, biyografi, telefon ve giriş bilgilerin silinir. Paylaştığın
          içerikler "Silinmiş Kullanıcı" adıyla kalabilir.
        </Text>
        <Text className="mb-2 mt-4 text-sm font-semibold text-red-800">
          Onaylamak için {DELETE_CONFIRM_WORD} yaz
        </Text>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={DELETE_CONFIRM_WORD}
          placeholderTextColor="#fca5a5"
          className="min-h-12 rounded-xl border border-red-200 bg-white px-4 text-text"
        />
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={!canDelete}
          accessibilityRole="button"
          className={`mt-3 min-h-12 items-center justify-center rounded-xl bg-danger ${
            canDelete ? "" : "opacity-40"
          }`}
        >
          {deleteAccount.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">Hesabımı kalıcı olarak sil</Text>
          )}
        </TouchableOpacity>
        {deleteError ? <Text className="mt-3 text-red-700">{deleteError}</Text> : null}
      </View>
    </Screen>
  );
}
