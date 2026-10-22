import { useEffect, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, Euro, MapPin, Send, Type, Users } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, FederalState } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, SectionLabel, Segmented, TipBox } from "@/components/ui/kit";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "bulusma", label: "Buluşma" },
  { value: "networking", label: "Networking" },
  { value: "yeni-gelenler", label: "Yeni gelenler" },
  { value: "dil-degisimi", label: "Dil değişimi" },
  { value: "aile", label: "Aile" },
  { value: "cocuk", label: "Çocuk" },
  { value: "spor", label: "Spor" },
  { value: "kultur-sanat", label: "Kültür & sanat" },
  { value: "ogrenci", label: "Öğrenci" },
  { value: "girisimci", label: "Girişimci" },
  { value: "seminer", label: "Seminer" },
  { value: "online", label: "Online" },
];

type Field =
  | "title"
  | "description"
  | "date"
  | "time"
  | "endTime"
  | "location"
  | "state"
  | "city"
  | "capacity"
  | "price";
type Errors = Partial<Record<Field, string>>;

/** "15072026" → "15.07.2026" */
function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

/** "1430" → "14:30" */
function maskTime(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function parseDate(v: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return { y, m, d };
}

function parseTime(v: string): { h: number; min: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(v);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
}

function parseAmount(v: string) {
  return Number(v.replace(",", ".").trim());
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** ISO tarih → "GG.AA.YYYY" / "SS:DD" (yerel saat) */
function splitIso(iso: string) {
  const d = new Date(iso);
  return {
    date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

export default function YeniEtkinlik() {
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEdit = !!editId;

  const descriptionRef = useRef<TextInput>(null);
  const dateRef = useRef<TextInput>(null);
  const timeRef = useRef<TextInput>(null);
  const endTimeRef = useRef<TextInput>(null);
  const locationRef = useRef<TextInput>(null);
  const capacityRef = useRef<TextInput>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [stateId, setStateId] = useState(user?.profile?.stateId ?? "");
  const [cityId, setCityId] = useState(user?.profile?.cityId ?? "");
  const [category, setCategory] = useState("bulusma");
  const [capacity, setCapacity] = useState("");
  const [priceType, setPriceType] = useState<"FREE" | "PAID">("FREE");
  const [priceAmount, setPriceAmount] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: states } = useQuery({
    queryKey: ["locations-states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
    staleTime: 60 * 60 * 1000,
  });

  const { data: existing } = useQuery({
    queryKey: ["event", editId],
    queryFn: () =>
      api.get<{
        title: string;
        description: string;
        location: string;
        startsAt: string;
        endsAt?: string | null;
        stateId: string;
        cityId: string;
        category?: string | null;
        capacity?: number | null;
        priceType: "FREE" | "PAID";
        priceAmount?: number | null;
      }>(`/events/${editId}`, token),
    enabled: !!token && isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description);
    setLocation(existing.location);
    const start = splitIso(existing.startsAt);
    setDate(start.date);
    setTime(start.time);
    if (existing.endsAt) setEndTime(splitIso(existing.endsAt).time);
    setStateId(existing.stateId);
    setCityId(existing.cityId);
    if (existing.category) setCategory(existing.category);
    if (existing.capacity) setCapacity(String(existing.capacity));
    setPriceType(existing.priceType);
    if (existing.priceAmount) setPriceAmount(String(existing.priceAmount));
  }, [existing]);

  const selectedState = states?.find((s) => s.id === stateId);

  function computeDates(): { start: Date | null; end: Date | null } {
    const d = parseDate(date);
    const t = parseTime(time);
    if (!d || !t) return { start: null, end: null };
    const start = new Date(d.y, d.m - 1, d.d, t.h, t.min);
    const et = endTime ? parseTime(endTime) : null;
    let end: Date | null = null;
    if (et) {
      end = new Date(d.y, d.m - 1, d.d, et.h, et.min);
      if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    return { start, end };
  }

  function validate(): Errors {
    const e: Errors = {};
    if (title.trim().length < 5) e.title = "Başlık en az 5 karakter olmalı";
    if (description.trim().length < 20)
      e.description = `Açıklama en az 20 karakter olmalı (${description.trim().length}/20)`;
    if (!parseDate(date)) e.date = "Geçerli bir tarih girin (GG.AA.YYYY)";
    if (!parseTime(time)) e.time = "Saat SS:DD biçiminde olmalı";
    if (endTime && !parseTime(endTime)) e.endTime = "Saat SS:DD biçiminde olmalı";
    if (!e.date && !e.time) {
      const { start } = computeDates();
      if (start && start.getTime() < Date.now()) e.date = "Başlangıç geçmişte olamaz";
    }
    if (!location.trim()) e.location = "Mekân veya adres girin";
    if (!stateId) e.state = "Eyalet seçin";
    else if (!cityId) e.city = "Şehir seçin";
    if (capacity) {
      const n = Number(capacity);
      if (!Number.isInteger(n) || n < 1) e.capacity = "Kapasite 1 veya daha büyük bir tam sayı olmalı";
    }
    if (priceType === "PAID") {
      const amount = parseAmount(priceAmount);
      if (!priceAmount.trim() || Number.isNaN(amount) || amount <= 0) e.price = "Geçerli bir fiyat girin";
    }
    return e;
  }

  const createMut = useMutation({
    mutationFn: () => {
      const { start, end } = computeDates();
      const payload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startsAt: start!.toISOString(),
        ...(end ? { endsAt: end.toISOString() } : {}),
        stateId,
        cityId,
        category,
        ...(capacity ? { capacity: Number(capacity) } : {}),
        priceType,
        ...(priceType === "PAID" ? { priceAmount: parseAmount(priceAmount) } : {}),
      };
      return isEdit
        ? api.patch<{ id: string }>(`/events/${editId}`, payload, token)
        : api.post<{ id: string }>("/events", payload, token);
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["event", editId] });
      router.replace(`/(tabs)/etkinlikler/${res.id ?? editId}`);
      if (!isEdit) Alert.alert("Etkinlik gönderildi", "Etkinliğin moderasyon onayından sonra yayınlanacak.");
      else Alert.alert("Güncellendi", "Etkinlik bilgileri güncellendi.");
    },
    onError: (e) =>
      Alert.alert(
        isEdit ? "Güncellenemedi" : "Etkinlik oluşturulamadı",
        e instanceof ApiError ? e.message : "Lütfen tekrar deneyin.",
      ),
  });

  function submit() {
    setSubmitted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    createMut.mutate();
  }

  function revalidate() {
    if (submitted) setErrors(validate());
  }

  function clearError(field: Field) {
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  }

  return (
    <Screen
      title={isEdit ? "Etkinliği Düzenle" : "Yeni Etkinlik"}
      subtitle={isEdit ? "Bilgileri güncelle" : "Topluluğu bir araya getir"}
      keyboardAware
    >
      <SectionLabel>Etkinlik bilgileri</SectionLabel>
      <Card>
        <TextField
          label="Başlık"
          icon={Type}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            clearError("title");
          }}
          onBlur={revalidate}
          placeholder="Örn: Berlin'de Türk kahvaltısı"
          maxLength={150}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => descriptionRef.current?.focus()}
          error={errors.title}
        />
        <TextField
          ref={descriptionRef}
          label="Açıklama"
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            clearError("description");
          }}
          onBlur={revalidate}
          placeholder="Etkinlikte ne yapılacak, kimler için uygun, neler getirilmeli?"
          multiline
          numberOfLines={5}
          maxLength={5000}
          error={errors.description}
          hint="En az 20 karakter"
          containerClassName="mb-0"
        />
      </Card>

      <SectionLabel>Kategori</SectionLabel>
      <ChipRow options={CATEGORIES} value={category} onChange={setCategory} />

      <SectionLabel>Tarih ve saat</SectionLabel>
      <Card>
        <TextField
          ref={dateRef}
          label="Tarih"
          icon={CalendarDays}
          value={date}
          onChangeText={(v) => {
            setDate(maskDate(v));
            clearError("date");
          }}
          onBlur={revalidate}
          placeholder="GG.AA.YYYY"
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => timeRef.current?.focus()}
          error={errors.date}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              ref={timeRef}
              label="Başlangıç"
              icon={Clock}
              value={time}
              onChangeText={(v) => {
                setTime(maskTime(v));
                clearError("time");
              }}
              onBlur={revalidate}
              placeholder="SS:DD"
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => endTimeRef.current?.focus()}
              error={errors.time}
              containerClassName="mb-0"
            />
          </View>
          <View className="flex-1">
            <TextField
              ref={endTimeRef}
              label="Bitiş (ops.)"
              icon={Clock}
              value={endTime}
              onChangeText={(v) => {
                setEndTime(maskTime(v));
                clearError("endTime");
              }}
              onBlur={revalidate}
              placeholder="SS:DD"
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => locationRef.current?.focus()}
              error={errors.endTime}
              containerClassName="mb-0"
            />
          </View>
        </View>
      </Card>

      <SectionLabel>Konum</SectionLabel>
      <Card>
        <TextField
          ref={locationRef}
          label="Mekân / adres"
          icon={MapPin}
          value={location}
          onChangeText={(v) => {
            setLocation(v);
            clearError("location");
          }}
          onBlur={revalidate}
          placeholder="Örn: Café Mitte, Alexanderplatz 1"
          maxLength={200}
          returnKeyType="done"
          error={errors.location}
        />
        <Text className="mb-2 text-sm font-semibold text-text">Eyalet</Text>
        <ChipRow
          options={(states ?? []).map((s) => ({ value: s.id, label: s.name }))}
          value={stateId}
          onChange={(v) => {
            setStateId(v);
            setCityId("");
            clearError("state");
          }}
        />
        {errors.state ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.state}</Text> : null}
        {selectedState ? (
          <>
            <Text className="mb-2 mt-4 text-sm font-semibold text-text">Şehir</Text>
            <ChipRow
              options={selectedState.cities.map((c) => ({ value: c.id, label: c.name }))}
              value={cityId}
              onChange={(v) => {
                setCityId(v);
                clearError("city");
              }}
            />
            {errors.city ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.city}</Text> : null}
          </>
        ) : null}
      </Card>

      <SectionLabel>Katılım</SectionLabel>
      <Card>
        <TextField
          ref={capacityRef}
          label="Kapasite (ops.)"
          icon={Users}
          value={capacity}
          onChangeText={(v) => {
            setCapacity(v.replace(/\D/g, ""));
            clearError("capacity");
          }}
          onBlur={revalidate}
          placeholder="Sınırsız"
          keyboardType="number-pad"
          maxLength={5}
          error={errors.capacity}
        />
        <Segmented
          options={[
            { value: "FREE", label: "Ücretsiz" },
            { value: "PAID", label: "Ücretli" },
          ]}
          value={priceType}
          onChange={(v) => {
            setPriceType(v);
            clearError("price");
          }}
        />
        {priceType === "PAID" ? (
          <TextField
            label="Bilet fiyatı (€)"
            icon={Euro}
            value={priceAmount}
            onChangeText={(v) => {
              setPriceAmount(v.replace(/[^\d.,]/g, ""));
              clearError("price");
            }}
            onBlur={revalidate}
            placeholder="Örn. 15"
            keyboardType="decimal-pad"
            maxLength={8}
            error={errors.price}
            containerClassName="mt-4 mb-0"
          />
        ) : null}
      </Card>

      {!isEdit ? (
        <View className="mt-6">
          <TipBox title="Bilgi">Etkinlikler moderasyon onayından sonra yayınlanır ve listede görünür.</TipBox>
        </View>
      ) : null}

      <Button
        label={isEdit ? "Değişiklikleri kaydet" : "Etkinliği gönder"}
        icon={Send}
        size="lg"
        className="mt-6 w-full"
        loading={createMut.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
