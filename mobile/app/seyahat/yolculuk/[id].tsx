import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError, TravelAnnouncement } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Screen } from "@/components/ui/Screen";

type TravelOffer = {
  id: string;
  itemName: string;
  description?: string | null;
  weightKg?: number | null;
  paymentType: "FREE" | "PAID" | "NEGOTIABLE";
  paymentAmount?: number | null;
  status: string;
  requester: { id: string; profile?: { displayName: string } | null };
};

type Detail = Omit<TravelAnnouncement, "requests"> & {
  requests: TravelOffer[];
  myRequest?: TravelOffer | null;
};

export default function TravelAnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const client = useQueryClient();
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const query = useQuery({
    queryKey: ["travel-announcement", id],
    queryFn: () => api.get<Detail>(`/travel-announcements/${id}`, token),
    enabled: !!id,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["travel-announcement", id] });

  const send = useMutation({
    mutationFn: () =>
      api.post(
        `/travel-announcements/${id}/requests`,
        {
          itemName: itemName.trim(),
          description: description.trim() || undefined,
          weightKg: weight ? Number(weight) : undefined,
          paymentType: paymentAmount ? "PAID" : "NEGOTIABLE",
          paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        },
        token,
      ),
    onSuccess: async () => {
      setItemName("");
      setDescription("");
      await refresh();
      Alert.alert("Gönderildi", "Taşıma isteğiniz yolcuya iletildi.");
    },
    onError: (error) =>
      Alert.alert("Gönderilemedi", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });
  const respond = useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      api.patch(
        `/travel-announcements/${id}/requests/${requestId}/${accept ? "accept" : "decline"}`,
        {},
        token,
      ),
    onSuccess: refresh,
  });
  const close = useMutation({
    mutationFn: () => api.patch(`/travel-announcements/${id}/close`, {}, token),
    onSuccess: refresh,
  });

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) {
    return <ErrorState title="Yolculuk ilanı bulunamadı" onRetry={() => void query.refetch()} />;
  }
  const item = query.data;

  return (
    <Screen title="Yolculuk ilanı" subtitle={`${item.fromCity} → ${item.toCity}`} keyboardAware>
      <Card className="mb-4">
        <View className="flex-row items-center justify-between">
          <Badge label={item.direction === "DE_TO_TR" ? "🇩🇪 → 🇹🇷" : "🇹🇷 → 🇩🇪"} color="primary" />
          <Badge label={item.status === "OPEN" ? "Açık" : "Kapalı"} color={item.status === "OPEN" ? "success" : "muted"} />
        </View>
        <Text className="mt-4 text-xl font-bold text-text">{item.fromCity} → {item.toCity}</Text>
        <Text className="mt-2 text-sm text-muted">
          {new Date(item.departureDate).toLocaleString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {item.availableKg != null && <Text className="mt-2 text-sm font-semibold text-primary">{item.availableKg} kg boş kapasite</Text>}
        {item.notes && <Text className="mt-4 text-sm leading-6 text-muted">{item.notes}</Text>}
      </Card>

      {!item.isOwner && item.status === "OPEN" && !item.myRequest && (
        <Card className="mb-4">
          <Text className="text-base font-bold text-text">Eşya taşıma isteği gönder</Text>
          <Input label="Eşya" value={itemName} onChangeText={setItemName} placeholder="Taşınacak eşya" />
          <Input label="Ağırlık (kg)" value={weight} onChangeText={setWeight} placeholder="Örn. 2" keyboardType="decimal-pad" />
          <Input label="Teklif (€)" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="Boş bırakılırsa pazarlık" keyboardType="decimal-pad" />
          <Input label="Açıklama" value={description} onChangeText={setDescription} placeholder="Teslim ayrıntıları" multiline />
          <Button
            label="İstek gönder"
            disabled={itemName.trim().length < 2}
            loading={send.isPending}
            onPress={() => send.mutate()}
          />
        </Card>
      )}

      {item.myRequest && (
        <Card className="mb-4 border-success/30 bg-success/5">
          <Text className="font-bold text-success">İsteğiniz: {item.myRequest.status}</Text>
        </Card>
      )}

      {item.isOwner && item.requests.length > 0 && (
        <View className="mb-4 gap-3">
          <Text className="text-base font-bold text-text">Gelen istekler</Text>
          {item.requests.map((offer) => (
            <Card key={offer.id}>
              <Text className="font-bold text-text">{offer.itemName}</Text>
              <Text className="mt-1 text-sm text-muted">{offer.requester.profile?.displayName ?? "Üye"}</Text>
              {offer.description && <Text className="mt-2 text-sm text-muted">{offer.description}</Text>}
              {offer.status === "PENDING" && (
                <View className="mt-4 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Kabul et"
                      loading={respond.isPending}
                      onPress={() => respond.mutate({ requestId: offer.id, accept: true })}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Reddet"
                      variant="secondary"
                      onPress={() => respond.mutate({ requestId: offer.id, accept: false })}
                    />
                  </View>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {item.isOwner && item.status === "OPEN" && (
        <Button
          label="İlanı kapat"
          variant="danger"
          loading={close.isPending}
          onPress={() => close.mutate()}
        />
      )}
    </Screen>
  );
}

function Input({
  label,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-sm font-semibold text-text">{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#9ca3af"
        className={`rounded-xl border border-border bg-background px-4 text-text ${
          multiline ? "min-h-[90px] py-3" : "min-h-12"
        }`}
      />
    </View>
  );
}
