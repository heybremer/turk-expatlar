import { useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Weight } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, Segmented } from "@/components/ui/kit";

type Direction = "DE_TO_TR" | "TR_TO_DE";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "DE_TO_TR", label: "🇩🇪 → 🇹🇷" },
  { value: "TR_TO_DE", label: "🇹🇷 → 🇩🇪" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

/** "GG.AA.YYYY" / "YYYY-AA-GG" + "SS:DD" → yerel Date. Hermes boşluklu ISO dizgelerini ayrıştıramadığı için elle yapılır. */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const v = dateStr.trim();
  let y: number, mo: number, d: number;
  const tr = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (tr) [d, mo, y] = [Number(tr[1]), Number(tr[2]), Number(tr[3])];
  else if (iso) [y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  let h = 12;
  let mi = 0;
  if (timeStr.trim()) {
    const t = timeStr.trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!t) return null;
    [h, mi] = [Number(t[1]), Number(t[2])];
    if (h > 23 || mi > 59) return null;
  }
  const date = new Date(y, mo - 1, d, h, mi);
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

const toNumber = (v: string) => Number(v.replace(",", "."));

export default function NewTravelAnnouncementScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [direction, setDirection] = useState<Direction>("DE_TO_TR");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [availableKg, setAvailableKg] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toRef = useRef<TextInput>(null);
  const dateRef = useRef<TextInput>(null);
  const timeRef = useRef<TextInput>(null);
  const kgRef = useRef<TextInput>(null);

  const departure = parseDateTime(departureDate, departureTime);
  const kgNum = availableKg.trim() ? toNumber(availableKg) : undefined;
  const errors = {
    fromCity: !fromCity.trim() ? "Kalkış şehrini girin." : undefined,
    toCity: !toCity.trim() ? "Varış şehrini girin." : undefined,
    departureDate: !departureDate.trim()
      ? "Kalkış tarihini girin."
      : !departure
        ? departureTime.trim()
          ? "Tarih (GG.AA.YYYY) veya saat (SS:DD) geçersiz."
          : "Tarih biçimi: GG.AA.YYYY"
        : departure.getTime() <= Date.now()
          ? "Kalkış tarihi gelecekte olmalı."
          : undefined,
    availableKg:
      kgNum !== undefined && (!Number.isFinite(kgNum) || kgNum < 0.1 || kgNum > 50)
        ? "Kapasite 0,1–50 kg arasında olmalı."
        : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(
        "/travel-announcements",
        {
          direction,
          fromCity: fromCity.trim(),
          toCity: toCity.trim(),
          departureDate: departure!.toISOString(),
          availableKg: kgNum,
          notes: notes.trim() || undefined,
        },
        token,
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["travel"] });
      router.replace(`/seyahat/yolculuk/${data.id}` as never);
    },
    onError: (error) =>
      Alert.alert("Oluşturulamadı", error instanceof ApiError ? error.message : "Tarihi ve alanları kontrol edin."),
  });

  const submit = () => {
    setSubmitted(true);
    if (hasErrors) return;
    mutation.mutate();
  };

  const today = new Date();
  const dateChips = [1, 3, 7, 14].map((days) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    return { value: toInput(d), label: days === 1 ? "Yarın" : days === 7 ? "1 hafta" : days === 14 ? "2 hafta" : `${days} gün` };
  });

  return (
    <Screen title="Yolculuk ilanı ver" subtitle="Taşıyabileceğin kapasiteyi paylaş" keyboardAware>
      <Text className="mb-2 text-sm font-semibold text-text">Yön</Text>
      <Segmented options={DIRECTIONS} value={direction} onChange={setDirection} className="mb-5" />

      <TextField
        label="Kalkış şehri"
        icon={MapPin}
        value={fromCity}
        onChangeText={setFromCity}
        placeholder={direction === "DE_TO_TR" ? "Berlin" : "İstanbul"}
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => toRef.current?.focus()}
        submitBehavior="submit"
        error={show("fromCity")}
      />
      <TextField
        ref={toRef}
        label="Varış şehri"
        icon={MapPin}
        value={toCity}
        onChangeText={setToCity}
        placeholder={direction === "DE_TO_TR" ? "İstanbul" : "Berlin"}
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => dateRef.current?.focus()}
        submitBehavior="submit"
        error={show("toCity")}
      />
      <View className="flex-row gap-3">
        <TextField
          ref={dateRef}
          label="Kalkış tarihi"
          containerClassName="flex-[3]"
          icon={CalendarDays}
          value={departureDate}
          onChangeText={setDepartureDate}
          placeholder="15.10.2026"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => timeRef.current?.focus()}
          submitBehavior="submit"
          error={show("departureDate")}
        />
        <TextField
          ref={timeRef}
          label="Saat"
          containerClassName="flex-[2]"
          icon={Clock}
          value={departureTime}
          onChangeText={setDepartureTime}
          placeholder="14:00"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => kgRef.current?.focus()}
          submitBehavior="submit"
        />
      </View>
      <ChipRow options={dateChips} value={departureDate} onChange={setDepartureDate} className="-mt-2 mb-5" />

      <TextField
        ref={kgRef}
        label="Boş kapasite (kg)"
        hint="İsteğe bağlı · en fazla 50 kg"
        icon={Weight}
        value={availableKg}
        onChangeText={setAvailableKg}
        placeholder="Örn. 5"
        keyboardType="decimal-pad"
        error={show("availableKg")}
      />
      <TextField
        label="Notlar"
        value={notes}
        onChangeText={setNotes}
        placeholder="Güzergâh ve teslim tercihleri"
        multiline
        maxLength={500}
        hint={`${notes.length}/500`}
      />

      <Button
        label="İlanı yayınla"
        size="lg"
        className="mt-2"
        loading={mutation.isPending}
        disabled={submitted && hasErrors}
        onPress={submit}
      />
    </Screen>
  );
}
