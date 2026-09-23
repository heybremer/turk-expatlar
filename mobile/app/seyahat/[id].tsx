import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, CourierRequest } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";

type Acceptance = {
  id: string;
  message?: string | null;
  travelDate?: string | null;
  traveler: NonNullable<CourierRequest["owner"]>;
};

type Detail = CourierRequest & {
  isOwner: boolean;
  myAcceptance?: Acceptance | null;
  acceptances: Acceptance[];
};

export default function CourierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const query = useQuery({
    queryKey: ["courier", id],
    queryFn: () => api.get<Detail>(`/courier/requests/${id}`, token),
    enabled: !!id,
  });

  const action = useMutation({
    mutationFn: ({ path, body = {} }: { path: string; body?: unknown }) =>
      api.post(path, body, token),
    onSuccess: async () => {
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["courier", id] });
    },
    onError: (error) =>
      Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });
  const patchAction = useMutation({
    mutationFn: (path: string) => api.patch(path, {}, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courier", id] });
    },
    onError: (error) =>
      Alert.alert("İşlem başarısız", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) {
    return <ErrorState title="Taşıma talebi bulunamadı" onRetry={() => void query.refetch()} />;
  }
  const item = query.data;

  return (
    <Screen title="Eşya talebi" subtitle={`${item.fromArea} → ${item.toArea}`} keyboardAware>
      <Card className="mb-4">
        <View className="flex-row items-center justify-between">
          <Badge label={item.direction === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪"} color="primary" />
          <Badge label={item.status} color={item.status === "OPEN" ? "success" : "muted"} />
        </View>
        <Text className="mt-4 text-xl font-bold text-text">{item.itemName}</Text>
        <Text className="mt-2 text-sm leading-6 text-muted">{item.notes || "Ek açıklama yok."}</Text>
        <View className="mt-4 gap-2 border-t border-border pt-4">
          <Info label="Kategori" value={item.itemCategory} />
          <Info label="Ağırlık" value={item.weightKg != null ? `${item.weightKg} kg` : "Belirtilmedi"} />
          <Info
            label="Ödeme"
            value={
              item.paymentType === "FREE"
                ? "Ücretsiz"
                : item.paymentType === "PAID"
                  ? `${item.paymentAmount ?? ""} €`
                  : "Pazarlığa açık"
            }
          />
        </View>
      </Card>

      {item.owner && (
        <TouchableOpacity onPress={() => router.push(`/kullanici/${item.owner!.id}` as never)}>
          <Card className="mb-4 flex-row items-center gap-3">
            <Avatar
              name={item.owner.profile?.displayName ?? "Üye"}
              url={item.owner.profile?.avatarUrl}
              size="md"
            />
            <View className="flex-1">
              <Text className="text-xs text-muted">Talep sahibi</Text>
              <Text className="font-bold text-text">{item.owner.profile?.displayName ?? "Üye"}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      )}

      {!item.isOwner && item.status === "OPEN" && !item.myAcceptance && (
        <Card className="mb-4">
          <Text className="text-base font-bold text-text">Taşımayı teklif et</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            placeholder="Yolculuk tarihinizi ve ayrıntıları yazın"
            placeholderTextColor="#9ca3af"
            className="my-4 min-h-[100px] rounded-xl border border-border bg-background px-4 py-3 text-text"
          />
          <Button
            label="Teklif gönder"
            loading={action.isPending}
            onPress={() =>
              action.mutate({
                path: `/courier/requests/${id}/accept`,
                body: { message: message.trim() || undefined },
              })
            }
          />
        </Card>
      )}

      {item.myAcceptance && (
        <Card className="mb-4 border-success/30 bg-success/5">
          <Text className="font-bold text-success">Teklifiniz gönderildi</Text>
          <Text className="mt-1 text-sm text-muted">Talep sahibinin onayı bekleniyor.</Text>
        </Card>
      )}

      {item.isOwner && item.acceptances.length > 0 && (
        <View className="mb-4 gap-3">
          <Text className="text-base font-bold text-text">Taşıyıcı teklifleri</Text>
          {item.acceptances.map((offer) => (
            <Card key={offer.id}>
              <Text className="font-bold text-text">{offer.traveler.profile?.displayName ?? "Üye"}</Text>
              {!!offer.message && <Text className="mt-2 text-sm text-muted">{offer.message}</Text>}
              {item.status === "OPEN" && (
                <View className="mt-3">
                  <Button
                    label="Bu teklifi onayla"
                    loading={patchAction.isPending}
                    onPress={() =>
                      patchAction.mutate(`/courier/requests/${id}/confirm/${offer.id}`)
                    }
                  />
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {item.isOwner && item.status === "MATCHED" && (
        <Button
          label="Taşımayı tamamlandı olarak işaretle"
          loading={patchAction.isPending}
          onPress={() => patchAction.mutate(`/courier/requests/${id}/complete`)}
        />
      )}
      {item.isOwner && item.status === "OPEN" && (
        <View className="mt-3">
          <Button
            label="Talebi iptal et"
            variant="danger"
            loading={patchAction.isPending}
            onPress={() =>
              Alert.alert("Talebi iptal et", "Bu işlem geri alınamaz.", [
                { text: "Vazgeç", style: "cancel" },
                {
                  text: "İptal et",
                  style: "destructive",
                  onPress: () => patchAction.mutate(`/courier/requests/${id}/cancel`),
                },
              ])
            }
          />
        </View>
      )}
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-text">{value}</Text>
    </View>
  );
}
