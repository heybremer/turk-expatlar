import { useState } from "react";
import { Alert, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Lock, ShieldCheck, Trash2, TriangleAlert } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonList } from "@/components/ui/LoadingScreen";
import { TextField } from "@/components/ui/TextField";
import { Screen } from "@/components/ui/Screen";
import { IconTile, ListGroup, ListRow, SectionLabel } from "@/components/ui/kit";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/colors";
import { formatRelative } from "@/lib/utils";

type BlockedUser = {
  id: string;
  profile: { displayName: string; avatarUrl?: string | null } | null;
  blockedAt: string;
};

const DELETE_CONFIRM_WORD = "SİL";
const QUERY_KEY = ["blocked-users"] as const;

export default function AccountScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const token = useAuth((state) => state.token);
  const twoFactorEnabled = useAuth((state) => !!state.user?.twoFactorEnabled);
  const logout = useAuth((state) => state.logout);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const blocked = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<BlockedUser[]>("/users/blocked", token),
    enabled: !!token,
  });

  const unblock = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}/block`, token),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<BlockedUser[]>(QUERY_KEY);
      qc.setQueryData<BlockedUser[]>(QUERY_KEY, (prev) => prev?.filter((b) => b.id !== userId));
      return { previous };
    },
    onError: (err, _userId, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous);
      Alert.alert("İşlem başarısız", err instanceof ApiError ? err.message : "Engel kaldırılamadı.");
    },
    onSettled: (_d, _e, userId) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      void qc.invalidateQueries({ queryKey: ["block-status", userId] });
    },
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

  const confirmUnblock = (entry: BlockedUser) => {
    const name = entry.profile?.displayName ?? "Kullanıcı";
    Alert.alert("Engeli kaldır", `${name} tekrar sana mesaj gönderebilecek.`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Engeli kaldır", onPress: () => unblock.mutate(entry.id) },
    ]);
  };

  const canDelete =
    confirmText.trim().toLocaleUpperCase("tr-TR") === DELETE_CONFIRM_WORD && !deleteAccount.isPending;

  const confirmDelete = () => {
    if (!canDelete) {
      setDeleteError(`Onaylamak için ${DELETE_CONFIRM_WORD} yaz`);
      return;
    }
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

  return (
    <Screen
      title="Hesap ve Gizlilik"
      subtitle="Engellenen kullanıcılar ve hesap silme"
      keyboardAware
      refreshControl={
        <RefreshControl
          refreshing={blocked.isRefetching && !blocked.isLoading}
          onRefresh={() => void blocked.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View className="-mt-6">
        <SectionLabel>Güvenlik</SectionLabel>
      </View>
      <ListGroup>
        <ListRow first icon={Lock} title="Şifre değiştir" onPress={() => router.push("/(tabs)/profil/sifre" as never)} />
        <ListRow
          icon={ShieldCheck}
          tint={colors.success}
          title="İki aşamalı doğrulama"
          subtitle={twoFactorEnabled ? "Açık" : "Kapalı"}
          onPress={() => router.push("/iki-asamali-dogrulama" as never)}
        />
      </ListGroup>

      <SectionLabel count={blocked.data?.length}>Engellenen kullanıcılar</SectionLabel>
      {blocked.isLoading ? (
        <View className="-m-4">
          <SkeletonList count={2} />
        </View>
      ) : blocked.isError ? (
        <ErrorState title="Liste yüklenemedi" onRetry={() => void blocked.refetch()} />
      ) : !blocked.data?.length ? (
        <Card className="flex-row items-center gap-3">
          <IconTile icon={ShieldCheck} tint={colors.success} size={40} />
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-text">Engellediğin kullanıcı yok</Text>
            <Text className="mt-0.5 text-xs text-muted">
              Bir profili engellediğinde burada görünür ve buradan kaldırabilirsin.
            </Text>
          </View>
        </Card>
      ) : (
        <View className="gap-3">
          {blocked.data.map((entry) => {
            const name = entry.profile?.displayName ?? "Kullanıcı";
            const pending = unblock.isPending && unblock.variables === entry.id;
            return (
              <Card key={entry.id} className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => router.push(`/kullanici/${entry.id}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} profilini aç`}
                  className="min-h-11 flex-1 flex-row items-center gap-3 active:opacity-70"
                >
                  <Avatar name={name} url={entry.profile?.avatarUrl} size="md" />
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-text" numberOfLines={1}>
                      {name}
                    </Text>
                    {entry.blockedAt ? (
                      <Text className="text-xs text-muted">{formatRelative(entry.blockedAt)} engellendi</Text>
                    ) : null}
                  </View>
                </Pressable>
                <Button
                  label="Kaldır"
                  variant="soft"
                  size="sm"
                  icon={Ban}
                  loading={pending}
                  disabled={unblock.isPending}
                  onPress={() => confirmUnblock(entry)}
                  accessibilityLabel={`${name} engelini kaldır`}
                />
              </Card>
            );
          })}
        </View>
      )}

      <SectionLabel>Tehlikeli bölge</SectionLabel>
      <View className="rounded-3xl border border-danger/20 bg-danger/5 p-5">
        <View className="flex-row items-center gap-3">
          <IconTile icon={TriangleAlert} tint={colors.danger} size={40} />
          <Text className="flex-1 text-lg font-extrabold text-danger">Hesabı sil</Text>
        </View>
        <Text className="mt-3 text-sm leading-6 text-text">
          Hesabın kapatılır; ad, fotoğraf, biyografi, telefon ve giriş bilgilerin silinir. Paylaştığın
          içerikler "Silinmiş Kullanıcı" adıyla kalabilir.
        </Text>
        <TextField
          label={`Onaylamak için ${DELETE_CONFIRM_WORD} yaz`}
          value={confirmText}
          onChangeText={(v) => {
            setConfirmText(v);
            if (deleteError) setDeleteError("");
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={confirmDelete}
          placeholder={DELETE_CONFIRM_WORD}
          error={deleteError || null}
          containerClassName="mt-4 mb-3"
        />
        <Button
          label="Hesabımı kalıcı olarak sil"
          variant="danger"
          size="lg"
          icon={Trash2}
          loading={deleteAccount.isPending}
          disabled={!canDelete}
          onPress={confirmDelete}
        />
      </View>
    </Screen>
  );
}
