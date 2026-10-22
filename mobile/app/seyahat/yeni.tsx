import { useRef, useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Euro, MapPin, Package, ShieldCheck, Weight } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, SectionLabel, Segmented, TipBox } from "@/components/ui/kit";

type Direction = "DE_TO_TR" | "TR_TO_DE";
type Payment = "FREE" | "PAID" | "NEGOTIABLE";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "DE_TO_TR", label: "🇩🇪 → 🇹🇷" },
  { value: "TR_TO_DE", label: "🇹🇷 → 🇩🇪" },
];
const CATEGORIES = [
  { value: "electronics", label: "Elektronik" },
  { value: "hediye", label: "Hediye" },
  { value: "kitap", label: "Kitap" },
  { value: "kiyafet", label: "Kıyafet" },
  { value: "ev-esyasi", label: "Ev eşyası" },
  { value: "diger", label: "Diğer" },
];
const PAYMENTS: { value: Payment; label: string }[] = [
  { value: "FREE", label: "Ücretsiz" },
  { value: "PAID", label: "Ücretli" },
  { value: "NEGOTIABLE", label: "Pazarlık" },
];
const EU_GIFT_LIMIT = 430;

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

/** "GG.AA.YYYY" veya "YYYY-AA-GG" biçimini Hermes'te güvenli ayrıştırır. */
function parseDateInput(value: string): Date | null {
  const v = value.trim();
  let y: number, mo: number, d: number;
  const tr = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (tr) [d, mo, y] = [Number(tr[1]), Number(tr[2]), Number(tr[3])];
  else if (iso) [y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  const date = new Date(y, mo - 1, d, 12, 0);
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

const toNumber = (v: string) => Number(v.replace(",", "."));

export default function NewCourierRequestScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [direction, setDirection] = useState<Direction>("DE_TO_TR");
  const [fromArea, setFromArea] = useState("");
  const [toArea, setToArea] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("diger");
  const [weight, setWeight] = useState("");
  const [value, setValue] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [paymentType, setPaymentType] = useState<Payment>("NEGOTIABLE");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toRef = useRef<TextInput>(null);
  const itemRef = useRef<TextInput>(null);

  const weightNum = weight.trim() ? toNumber(weight) : undefined;
  const valueNum = value.trim() ? toNumber(value) : undefined;
  const amountNum = paymentAmount.trim() ? toNumber(paymentAmount) : undefined;
  const date = preferredDate.trim() ? parseDateInput(preferredDate) : null;
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const errors = {
    fromArea: fromArea.trim().length < 2 ? "En az 2 karakter girin." : undefined,
    toArea: toArea.trim().length < 2 ? "En az 2 karakter girin." : undefined,
    itemName: itemName.trim().length < 2 ? "Eşya adını girin." : undefined,
    weight:
      weightNum !== undefined && (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 20)
        ? "Ağırlık 0–20 kg arasında olmalı."
        : undefined,
    value: valueNum !== undefined && (!Number.isFinite(valueNum) || valueNum < 0) ? "Geçerli bir tutar girin." : undefined,
    paymentAmount:
      paymentType === "PAID" && (amountNum === undefined || !Number.isFinite(amountNum) || amountNum <= 0)
        ? "Ücret tutarını girin."
        : undefined,
    preferredDate: preferredDate.trim()
      ? !date
        ? "Tarih biçimi: GG.AA.YYYY"
        : date < todayStart
          ? "Tarih bugünden önce olamaz."
          : undefined
      : undefined,
    acknowledged: !acknowledged ? "Devam etmek için beyanı onaylayın." : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(
        "/courier/requests",
        {
          direction,
          fromArea: fromArea.trim(),
          toArea: toArea.trim(),
          itemName: itemName.trim(),
          itemCategory,
          weightKg: weightNum,
          estimatedValueEur: valueNum,
          paymentType,
          paymentAmount: paymentType === "PAID" ? amountNum : undefined,
          notes: notes.trim() || undefined,
          preferredDate: date ? date.toISOString() : undefined,
          forbiddenItemsAcknowledged: acknowledged,
        },
        token,
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["travel"] });
      router.replace(`/seyahat/${data.id}` as never);
    },
    onError: (error) => Alert.alert("Oluşturulamadı", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });

  const submit = () => {
    setSubmitted(true);
    if (hasErrors) return;
    mutation.mutate();
  };

  const today = new Date();
  const dateChips = [3, 7, 14, 30].map((days) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    return { value: toInput(d), label: days === 7 ? "1 hafta" : days === 14 ? "2 hafta" : days === 30 ? "1 ay" : `${days} gün` };
  });

  return (
    <Screen title="Eşya talebi oluştur" subtitle="Türkiye–Almanya arası gönderi" keyboardAware>
      <Text className="mb-2 text-sm font-semibold text-text">Yön</Text>
      <Segmented options={DIRECTIONS} value={direction} onChange={setDirection} className="mb-5" />

      <TextField
        label="Nereden"
        icon={MapPin}
        value={fromArea}
        onChangeText={setFromArea}
        placeholder={direction === "DE_TO_TR" ? "Berlin, Almanya" : "İstanbul, Türkiye"}
        returnKeyType="next"
        onSubmitEditing={() => toRef.current?.focus()}
        submitBehavior="submit"
        error={show("fromArea")}
      />
      <TextField
        ref={toRef}
        label="Nereye"
        icon={MapPin}
        value={toArea}
        onChangeText={setToArea}
        placeholder={direction === "DE_TO_TR" ? "İstanbul, Türkiye" : "Berlin, Almanya"}
        returnKeyType="next"
        onSubmitEditing={() => itemRef.current?.focus()}
        submitBehavior="submit"
        error={show("toArea")}
      />
      <TextField
        ref={itemRef}
        label="Eşya"
        icon={Package}
        value={itemName}
        onChangeText={setItemName}
        placeholder="Gönderilecek eşya"
        returnKeyType="done"
        maxLength={150}
        error={show("itemName")}
      />

      <SectionLabel>Kategori</SectionLabel>
      <ChipRow options={CATEGORIES} value={itemCategory} onChange={setItemCategory} className="mb-5" />

      <View className="flex-row gap-3">
        <TextField
          label="Ağırlık (kg)"
          containerClassName="flex-1"
          icon={Weight}
          value={weight}
          onChangeText={setWeight}
          placeholder="Örn. 2,5"
          keyboardType="decimal-pad"
          error={show("weight")}
        />
        <TextField
          label="Değer (€)"
          containerClassName="flex-1"
          icon={ShieldCheck}
          value={value}
          onChangeText={setValue}
          placeholder="Örn. 50"
          keyboardType="decimal-pad"
          error={show("value")}
        />
      </View>
      {valueNum !== undefined && valueNum > EU_GIFT_LIMIT ? (
        <View className="mb-4">
          <TipBox tone="warning" title="Gümrük uyarısı">
            {`AB hediye muafiyeti ${EU_GIFT_LIMIT} €'dur. Bu değerin üzerindeki eşyalar gümrüğe tabi olabilir.`}
          </TipBox>
        </View>
      ) : null}

      <TextField
        label="Tercih edilen tarih"
        hint="İsteğe bağlı · GG.AA.YYYY"
        icon={CalendarDays}
        value={preferredDate}
        onChangeText={setPreferredDate}
        placeholder="15.10.2026"
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
        error={show("preferredDate")}
      />
      <ChipRow options={dateChips} value={preferredDate} onChange={setPreferredDate} className="-mt-2 mb-5" />

      <Text className="mb-2 text-sm font-semibold text-text">Ödeme</Text>
      <Segmented options={PAYMENTS} value={paymentType} onChange={setPaymentType} className="mb-5" />
      {paymentType === "PAID" ? (
        <TextField
          label="Tutar (€)"
          icon={Euro}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="Örn. 20"
          keyboardType="decimal-pad"
          error={show("paymentAmount")}
        />
      ) : null}
      <TextField
        label="Notlar"
        value={notes}
        onChangeText={setNotes}
        placeholder="Teslim ve eşya ayrıntıları"
        multiline
        maxLength={1000}
      />

      <Pressable
        onPress={() => setAcknowledged((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: acknowledged }}
        className={`mt-2 flex-row items-center gap-3 rounded-2xl border p-4 ${
          show("acknowledged") ? "border-danger bg-danger/5" : "border-warning/30 bg-warning/5"
        }`}
      >
        <Text className="flex-1 text-sm leading-5 text-text">
          Eşyanın yasaklı, tehlikeli veya ticari ürün içermediğini onaylıyorum.
        </Text>
        <Switch
          value={acknowledged}
          onValueChange={setAcknowledged}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
          accessibilityLabel="Yasaklı eşya beyanı"
        />
      </Pressable>
      {show("acknowledged") ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.acknowledged}</Text> : null}

      <Button
        label="Talebi yayınla"
        size="lg"
        className="mt-6"
        disabled={submitted && hasErrors}
        loading={mutation.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
