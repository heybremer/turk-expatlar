import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, FederalState } from "@/lib/api";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function YeniEtkinlik() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [cityId, setCityId] = useState("");
  const [stateId, setStateId] = useState("");
  const [priceType, setPriceType] = useState<"FREE" | "PAID">("FREE");

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
  });

  const selectedState = states?.find((s) => s.id === stateId);

  const createMut = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/events", { title, description, location, startsAt, cityId, stateId, priceType }, token),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["events"] });
      router.replace(`/(tabs)/etkinlikler/${res.id}`);
    },
    onError: () => Alert.alert("Hata", "Etkinlik oluşturulamadı"),
  });

  const canSubmit = title.trim() && description.trim() && location.trim() && startsAt && stateId && cityId;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader
        title="Yeni Etkinlik"
        action={
          <TouchableOpacity
            disabled={!canSubmit || createMut.isPending}
            onPress={() => createMut.mutate()}
            className={`bg-primary rounded-xl px-4 py-2 ${(!canSubmit || createMut.isPending) ? "opacity-50" : ""}`}
          >
            {createMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-semibold text-sm">Yayınla</Text>}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {[
          { label: "Başlık", value: title, onChange: setTitle, placeholder: "Etkinlik başlığı" },
          { label: "Konum", value: location, onChange: setLocation, placeholder: "Adres veya yer adı" },
          { label: "Başlangıç Tarihi", value: startsAt, onChange: setStartsAt, placeholder: "2026-07-15T14:00:00" },
        ].map(({ label, value, onChange, placeholder }) => (
          <View key={label}>
            <Text className="text-sm font-medium text-text mb-1">{label}</Text>
            <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9ca3af" className="bg-surface border border-border rounded-xl px-4 py-3 text-text" />
          </View>
        ))}

        <View>
          <Text className="text-sm font-medium text-text mb-1">Açıklama</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Etkinliği açıklayın…" placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" className="bg-surface border border-border rounded-xl px-4 py-3 text-text min-h-[100]" />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">Eyalet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {states?.map((s) => (
              <TouchableOpacity key={s.id} onPress={() => { setStateId(s.id); setCityId(""); }} className={`rounded-full px-4 py-2 border ${stateId === s.id ? "bg-primary border-primary" : "bg-surface border-border"}`}>
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
                <TouchableOpacity key={c.id} onPress={() => setCityId(c.id)} className={`rounded-full px-4 py-2 border ${cityId === c.id ? "bg-primary border-primary" : "bg-surface border-border"}`}>
                  <Text className={`text-sm font-medium ${cityId === c.id ? "text-white" : "text-muted"}`}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View>
          <Text className="text-sm font-medium text-text mb-2">Giriş</Text>
          <View className="flex-row gap-3">
            {(["FREE", "PAID"] as const).map((pt) => (
              <TouchableOpacity key={pt} onPress={() => setPriceType(pt)} className={`flex-1 items-center rounded-xl border py-3 ${priceType === pt ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
                <Text className={`font-semibold text-sm ${priceType === pt ? "text-primary" : "text-muted"}`}>{pt === "FREE" ? "Ücretsiz" : "Ücretli"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
