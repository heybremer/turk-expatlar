import { useState } from "react";
import { Alert, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

type Direction = "DE_TO_TR" | "TR_TO_DE";
type Payment = "FREE" | "PAID" | "NEGOTIABLE";

export default function NewCourierRequestScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [direction, setDirection] = useState<Direction>("DE_TO_TR");
  const [fromArea, setFromArea] = useState("");
  const [toArea, setToArea] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("diger");
  const [weight, setWeight] = useState("");
  const [paymentType, setPaymentType] = useState<Payment>("NEGOTIABLE");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

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
          weightKg: weight ? Number(weight) : undefined,
          paymentType,
          paymentAmount: paymentType === "PAID" && paymentAmount ? Number(paymentAmount) : undefined,
          notes: notes.trim() || undefined,
          forbiddenItemsAcknowledged: acknowledged,
        },
        token,
      ),
    onSuccess: (data) => router.replace(`/seyahat/${data.id}` as never),
    onError: (error) =>
      Alert.alert("Oluşturulamadı", error instanceof ApiError ? error.message : "Tekrar deneyin."),
  });

  const valid =
    fromArea.trim().length >= 2 &&
    toArea.trim().length >= 2 &&
    itemName.trim().length >= 2 &&
    acknowledged;

  return (
    <Screen title="Eşya talebi oluştur" subtitle="Türkiye–Almanya arası gönderi" keyboardAware>
      <ChoiceRow
        label="Yön"
        value={direction}
        options={[
          ["DE_TO_TR", "Almanya → Türkiye"],
          ["TR_TO_DE", "Türkiye → Almanya"],
        ]}
        onChange={(value) => setDirection(value as Direction)}
      />
      <Field label="Nereden" value={fromArea} onChangeText={setFromArea} placeholder="Berlin, Almanya" />
      <Field label="Nereye" value={toArea} onChangeText={setToArea} placeholder="İstanbul, Türkiye" />
      <Field label="Eşya" value={itemName} onChangeText={setItemName} placeholder="Gönderilecek eşya" />
      <ChoiceRow
        label="Kategori"
        value={itemCategory}
        options={[
          ["electronics", "Elektronik"],
          ["hediye", "Hediye"],
          ["kitap", "Kitap"],
          ["kiyafet", "Kıyafet"],
          ["diger", "Diğer"],
        ]}
        onChange={setItemCategory}
      />
      <Field
        label="Ağırlık (kg)"
        value={weight}
        onChangeText={setWeight}
        placeholder="Örn. 2.5"
        keyboardType="decimal-pad"
      />
      <ChoiceRow
        label="Ödeme"
        value={paymentType}
        options={[
          ["FREE", "Ücretsiz"],
          ["PAID", "Ücretli"],
          ["NEGOTIABLE", "Pazarlık"],
        ]}
        onChange={(value) => setPaymentType(value as Payment)}
      />
      {paymentType === "PAID" && (
        <Field
          label="Tutar (€)"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="Örn. 20"
          keyboardType="decimal-pad"
        />
      )}
      <Field
        label="Notlar"
        value={notes}
        onChangeText={setNotes}
        placeholder="Teslim ve eşya ayrıntıları"
        multiline
      />

      <TouchableOpacity
        onPress={() => setAcknowledged((value) => !value)}
        className="mb-6 flex-row items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4"
      >
        <Switch value={acknowledged} onValueChange={setAcknowledged} />
        <Text className="flex-1 text-sm leading-5 text-muted">
          Eşyanın yasaklı, tehlikeli veya ticari ürün içermediğini onaylıyorum.
        </Text>
      </TouchableOpacity>

      <Button
        label="Talebi yayınla"
        size="lg"
        disabled={!valid}
        loading={mutation.isPending}
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

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-text">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(([key, text]) => (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            className={`min-h-11 justify-center rounded-xl border px-3 ${
              value === key ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <Text className={value === key ? "font-semibold text-primary" : "text-muted"}>{text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
