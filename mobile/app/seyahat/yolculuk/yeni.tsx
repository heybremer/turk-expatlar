import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

type Direction = "DE_TO_TR" | "TR_TO_DE";

export default function NewTravelAnnouncementScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [direction, setDirection] = useState<Direction>("DE_TO_TR");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [availableKg, setAvailableKg] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(
        "/travel-announcements",
        {
          direction,
          fromCity: fromCity.trim(),
          toCity: toCity.trim(),
          departureDate: new Date(departureDate).toISOString(),
          availableKg: availableKg ? Number(availableKg) : undefined,
          notes: notes.trim() || undefined,
        },
        token,
      ),
    onSuccess: (data) => router.replace(`/seyahat/yolculuk/${data.id}` as never),
    onError: (error) =>
      Alert.alert("Oluşturulamadı", error instanceof ApiError ? error.message : "Tarihi ve alanları kontrol edin."),
  });

  const dateValid = departureDate.length >= 10 && !Number.isNaN(new Date(departureDate).getTime());
  const valid = fromCity.trim().length >= 2 && toCity.trim().length >= 2 && dateValid;

  return (
    <Screen title="Yolculuk ilanı ver" subtitle="Taşıyabileceğiniz kapasiteyi paylaşın" keyboardAware>
      <Text className="mb-2 text-sm font-bold text-text">Yön</Text>
      <View className="mb-5 flex-row gap-2">
        {[
          ["DE_TO_TR", "Almanya → Türkiye"],
          ["TR_TO_DE", "Türkiye → Almanya"],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            onPress={() => setDirection(value as Direction)}
            className={`min-h-11 flex-1 items-center justify-center rounded-xl border ${
              direction === value ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <Text className={direction === value ? "font-semibold text-primary" : "text-muted"}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Kalkış şehri" value={fromCity} onChangeText={setFromCity} placeholder="Berlin" />
      <Field label="Varış şehri" value={toCity} onChangeText={setToCity} placeholder="İstanbul" />
      <Field
        label="Kalkış tarihi"
        value={departureDate}
        onChangeText={setDepartureDate}
        placeholder="2026-10-15 14:00"
        autoCapitalize="none"
      />
      <Field
        label="Boş kapasite (kg)"
        value={availableKg}
        onChangeText={setAvailableKg}
        placeholder="Örn. 5"
        keyboardType="decimal-pad"
      />
      <Field
        label="Notlar"
        value={notes}
        onChangeText={setNotes}
        placeholder="Güzergâh ve teslim tercihleri"
        multiline
      />

      <Button
        label="İlanı yayınla"
        size="lg"
        loading={mutation.isPending}
        disabled={!valid}
        onPress={() => mutation.mutate()}
      />
    </Screen>
  );
}

function Field({
  label,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-text">{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#9ca3af"
        className={`rounded-xl border border-border bg-surface px-4 text-text ${
          multiline ? "min-h-[110px] py-3" : "min-h-12"
        }`}
      />
    </View>
  );
}
