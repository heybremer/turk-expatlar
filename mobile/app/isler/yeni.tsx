import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, FederalState } from "@/lib/api";
import { DetailHeader } from "@/components/navigation/DetailHeader";

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Tam Zamanlı" },
  { value: "PART_TIME", label: "Yarı Zamanlı" },
  { value: "MINIJOB", label: "Minijob" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "INTERNSHIP", label: "Staj" },
  { value: "FREELANCE", label: "Freelance" },
];

const LISTING_TYPES = [
  { value: "EMPLOYER", label: "İş İlanı (İşveren)" },
  { value: "SEEKER", label: "İş Arıyorum" },
];

export default function YeniIsIlani() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [listingType, setListingType] = useState<"EMPLOYER" | "SEEKER">("EMPLOYER");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("FULL_TIME");
  const [turkishFriendly, setTurkishFriendly] = useState(false);
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
  });
  const selectedState = states?.find((s) => s.id === stateId);

  const createMut = useMutation({
    mutationFn: () => api.post<{ id: string }>("/jobs", { listingType, title, company, description, jobType, workMode: "ONSITE", turkishFriendly, stateId, cityId, contactMethod: "PLATFORM" }, token),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      router.replace(`/isler/${res.id}`);
    },
    onError: () => Alert.alert("Hata", "İlan oluşturulamadı"),
  });

  const canSubmit = title.trim() && description.trim() && stateId && cityId;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DetailHeader
        title="İlan Ver"
        action={
          <TouchableOpacity disabled={!canSubmit || createMut.isPending} onPress={() => createMut.mutate()} className={`bg-primary rounded-xl px-4 py-2 ${(!canSubmit || createMut.isPending) ? "opacity-50" : ""}`}>
            <Text className="text-white font-semibold text-sm">Yayınla</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text className="text-sm font-medium text-text mb-2">İlan Türü</Text>
          <View className="flex-row gap-3">
            {LISTING_TYPES.map((lt) => (
              <TouchableOpacity key={lt.value} onPress={() => setListingType(lt.value as "EMPLOYER" | "SEEKER")} className={`flex-1 items-center rounded-xl border py-3 ${listingType === lt.value ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
                <Text className={`text-xs font-semibold ${listingType === lt.value ? "text-primary" : "text-muted"}`}>{lt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {[
          { label: "Başlık", value: title, onChange: setTitle, placeholder: "Pozisyon veya meslek adı" },
          { label: "Şirket (opsiyonel)", value: company, onChange: setCompany, placeholder: "Şirket adı" },
        ].map(({ label, value, onChange, placeholder }) => (
          <View key={label}>
            <Text className="text-sm font-medium text-text mb-1">{label}</Text>
            <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9ca3af" className="bg-surface border border-border rounded-xl px-4 py-3 text-text" />
          </View>
        ))}

        <View>
          <Text className="text-sm font-medium text-text mb-1">Açıklama</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="İlanı detaylandırın…" placeholderTextColor="#9ca3af" multiline numberOfLines={5} textAlignVertical="top" className="bg-surface border border-border rounded-xl px-4 py-3 text-text min-h-[120]" />
        </View>

        <View>
          <Text className="text-sm font-medium text-text mb-2">Çalışma Türü</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {JOB_TYPES.map((jt) => (
              <TouchableOpacity key={jt.value} onPress={() => setJobType(jt.value)} className={`rounded-full px-4 py-2 border ${jobType === jt.value ? "bg-primary border-primary" : "bg-surface border-border"}`}>
                <Text className={`text-sm font-medium ${jobType === jt.value ? "text-white" : "text-muted"}`}>{jt.label}</Text>
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

        <TouchableOpacity onPress={() => setTurkishFriendly((v) => !v)} className="flex-row items-center gap-3 py-2">
          <View className={`h-5 w-5 rounded border-2 items-center justify-center ${turkishFriendly ? "border-primary bg-primary" : "border-border"}`}>
            {turkishFriendly && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text className="text-sm font-medium text-text">🇹🇷 Türkçe konuşan tercih edilir</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
