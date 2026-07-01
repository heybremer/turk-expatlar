import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, FederalState } from "@/lib/api";
import { DetailHeader } from "@/components/navigation/DetailHeader";

export default function YeniIsletme() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [stateId, setStateId] = useState("");
  const [speaksTurkish, setSpeaksTurkish] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["biz-categories"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/businesses/categories", token),
    enabled: !!token,
  });
  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
  });
  const selectedState = states?.find((s) => s.id === stateId);

  const createMut = useMutation({
    mutationFn: () => api.post<{ id: string }>("/businesses", { name, description, address, phone, categoryId, cityId, stateId, speaksTurkish }, token),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
      router.replace(`/rehber/${res.id}`);
    },
    onError: () => Alert.alert("Hata", "İşletme eklenemedi"),
  });

  const canSubmit = name.trim() && description.trim() && categoryId && stateId && cityId;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader
        title="İşletme Ekle"
        action={
          <TouchableOpacity disabled={!canSubmit || createMut.isPending} onPress={() => createMut.mutate()} className={`bg-primary rounded-xl px-4 py-2 ${(!canSubmit || createMut.isPending) ? "opacity-50" : ""}`}>
            <Text className="text-white font-semibold text-sm">Kaydet</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {[
          { label: "İşletme Adı", value: name, onChange: setName, placeholder: "örn. Türk Kebap Haus" },
          { label: "Adres", value: address, onChange: setAddress, placeholder: "Sokak, No, Şehir" },
          { label: "Telefon", value: phone, onChange: setPhone, placeholder: "+49 ..." },
        ].map(({ label, value, onChange, placeholder }) => (
          <View key={label}>
            <Text className="text-sm font-medium text-text mb-1">{label}</Text>
            <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9ca3af" className="bg-surface border border-border rounded-xl px-4 py-3 text-text" />
          </View>
        ))}

        <View>
          <Text className="text-sm font-medium text-text mb-1">Açıklama</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="İşletmenizi tanıtın…" placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" className="bg-surface border border-border rounded-xl px-4 py-3 text-text min-h-[100]" />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categories?.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)} className={`rounded-full px-4 py-2 border ${categoryId === c.id ? "bg-primary border-primary" : "bg-surface border-border"}`}>
                <Text className={`text-sm font-medium ${categoryId === c.id ? "text-white" : "text-muted"}`}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

        <TouchableOpacity onPress={() => setSpeaksTurkish((v) => !v)} className="flex-row items-center gap-3 py-2">
          <View className={`h-5 w-5 rounded border-2 items-center justify-center ${speaksTurkish ? "border-primary bg-primary" : "border-border"}`}>
            {speaksTurkish && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text className="text-sm font-medium text-text">🇹🇷 Türkçe konuşuyor</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
