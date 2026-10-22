import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartBar, Plus, Send, Type, UserX, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, IconTile, SectionLabel, TipBox } from "@/components/ui/kit";

type Category = { id: string; name: string; slug: string };
type Errors = { title?: string; body?: string; category?: string; poll?: string };

const MAX_POLL_OPTIONS = 10;

export default function YeniForumKonusu() {
  const { token, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const bodyRef = useRef<TextInput>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stateId, setStateId] = useState(user?.profile?.stateId ?? "");
  const [cityId, setCityId] = useState(user?.profile?.cityId ?? "");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => api.get<Category[]>("/forum/categories", token),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });

  const { data: states } = useQuery({
    queryKey: ["locations-states"],
    queryFn: () => api.get<FederalState[]>("/locations/states", token),
    enabled: !!token,
    staleTime: 60 * 60 * 1000,
  });

  const selectedState = states?.find((s) => s.id === stateId);
  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);

  function validate(): Errors {
    const e: Errors = {};
    if (title.trim().length < 5) e.title = "Başlık en az 5 karakter olmalı";
    if (body.trim().length < 20) e.body = `İçerik en az 20 karakter olmalı (${body.trim().length}/20)`;
    if (!categoryId) e.category = "Bir kategori seçin";
    if (pollEnabled) {
      if (!pollQuestion.trim()) e.poll = "Anket sorusunu yazın";
      else if (filledOptions.length < 2) e.poll = "En az 2 seçenek girin";
      else if (new Set(filledOptions.map((o) => o.toLocaleLowerCase("tr"))).size !== filledOptions.length)
        e.poll = "Seçenekler birbirinden farklı olmalı";
    }
    return e;
  }

  const createMut = useMutation({
    mutationFn: async () => {
      const topic = await api.post<{ id: string }>(
        "/forum/topics",
        {
          title: title.trim(),
          body: body.trim(),
          categoryId,
          stateId: stateId || undefined,
          cityId: cityId || undefined,
          isAnonymous,
        },
        token,
      );
      let pollFailed: string | null = null;
      if (pollEnabled) {
        try {
          await api.post(
            `/forum/topics/${topic.id}/poll`,
            { question: pollQuestion.trim(), options: filledOptions },
            token,
          );
        } catch (e) {
          pollFailed = e instanceof ApiError ? e.message : "Anket eklenemedi";
        }
      }
      return { id: topic.id, pollFailed };
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["forum-topics"] });
      router.replace(`/(tabs)/forum/${res.id}`);
      if (res.pollFailed) Alert.alert("Konu paylaşıldı", `Ancak anket eklenemedi: ${res.pollFailed}`);
    },
    onError: (e) => Alert.alert("Konu oluşturulamadı", e instanceof ApiError ? e.message : "Lütfen tekrar deneyin."),
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

  function updateOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  return (
    <Screen title="Yeni Konu" subtitle="Topluluğa soru sor veya deneyim paylaş" keyboardAware>
      <SectionLabel>Kategori</SectionLabel>
      {categoriesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start" }} />
      ) : categoriesError ? (
        <Button label="Kategoriler yüklenemedi · Tekrar dene" size="sm" variant="secondary" onPress={() => void refetchCategories()} />
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {(categories ?? []).map((cat) => {
            const active = categoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setCategoryId(cat.id);
                  if (errors.category) setErrors((p) => ({ ...p, category: undefined }));
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                hitSlop={4}
                className={`min-h-10 justify-center rounded-full border px-4 ${
                  active ? "border-primary bg-primary" : "border-border bg-surface"
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? "text-white" : "text-muted"}`}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {errors.category ? <Text className="mt-1.5 text-xs font-medium text-danger">{errors.category}</Text> : null}

      <SectionLabel>Konu</SectionLabel>
      <Card>
        <TextField
          label="Başlık"
          icon={Type}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
          }}
          onBlur={revalidate}
          placeholder="Örn: Anmeldung randevusu bulamıyorum"
          maxLength={150}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => bodyRef.current?.focus()}
          error={errors.title}
          hint={`${title.length}/150 · en az 5 karakter`}
        />
        <TextField
          ref={bodyRef}
          label="İçerik"
          value={body}
          onChangeText={(v) => {
            setBody(v);
            if (errors.body) setErrors((p) => ({ ...p, body: undefined }));
          }}
          onBlur={revalidate}
          placeholder="Durumunu, denediklerini ve ne tür cevap aradığını yaz."
          multiline
          numberOfLines={8}
          maxLength={10000}
          error={errors.body}
          hint="En az 20 karakter. Bağlam ne kadar netse cevaplar o kadar iyi olur."
          containerClassName="mb-0"
        />
      </Card>

      <SectionLabel>Konum (opsiyonel)</SectionLabel>
      <Text className="-mt-1 mb-2 text-xs text-muted">Eyalet</Text>
      <ChipRow
        options={(states ?? []).map((s) => ({ value: s.id, label: s.name }))}
        value={stateId}
        onChange={(v) => {
          setStateId((prev) => (prev === v ? "" : v));
          setCityId("");
        }}
      />
      {selectedState ? (
        <>
          <Text className="mb-2 mt-4 text-xs text-muted">Şehir</Text>
          <ChipRow
            options={selectedState.cities.map((c) => ({ value: c.id, label: c.name }))}
            value={cityId}
            onChange={(v) => setCityId((prev) => (prev === v ? "" : v))}
          />
        </>
      ) : null}

      <SectionLabel>Anket (opsiyonel)</SectionLabel>
      <Card>
        <View className="flex-row items-center gap-3">
          <IconTile icon={ChartBar} size={40} />
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-text">Anket ekle</Text>
            <Text className="mt-0.5 text-xs text-muted">Topluluğun görüşünü 2–10 seçenekle sor</Text>
          </View>
          <Switch
            value={pollEnabled}
            onValueChange={(v) => {
              setPollEnabled(v);
              if (!v) setErrors((p) => ({ ...p, poll: undefined }));
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Anket ekle"
          />
        </View>
        {pollEnabled ? (
          <View className="mt-4">
            <TextField
              label="Soru"
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Örn: Hangi bankayı öneriyorsunuz?"
              maxLength={200}
              returnKeyType="next"
            />
            {pollOptions.map((opt, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <View className="flex-1">
                  <TextField
                    value={opt}
                    onChangeText={(v) => updateOption(i, v)}
                    placeholder={`Seçenek ${i + 1}`}
                    accessibilityLabel={`Seçenek ${i + 1}`}
                    maxLength={100}
                    returnKeyType="done"
                  />
                </View>
                {pollOptions.length > 2 ? (
                  <Pressable
                    onPress={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    accessibilityRole="button"
                    accessibilityLabel={`Seçenek ${i + 1} kaldır`}
                    className="h-12 w-11 items-center justify-center active:opacity-60"
                  >
                    <X size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {pollOptions.length < MAX_POLL_OPTIONS ? (
              <Button
                label="Seçenek ekle"
                icon={Plus}
                size="sm"
                variant="soft"
                className="self-start"
                onPress={() => setPollOptions((prev) => [...prev, ""])}
              />
            ) : null}
            {errors.poll ? <Text className="mt-2 text-xs font-medium text-danger">{errors.poll}</Text> : null}
          </View>
        ) : null}
      </Card>

      <SectionLabel>Gizlilik</SectionLabel>
      <Card className="flex-row items-center gap-3">
        <IconTile icon={UserX} size={40} />
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-text">Anonim olarak gönder</Text>
          <Text className="mt-0.5 text-xs text-muted">Moderasyon onayından geçer</Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel="Anonim olarak gönder"
        />
      </Card>

      <View className="mt-6">
        <TipBox title="İpucu">
          Aynı soruyu açmadan önce forumda arama yapın ve doğru kategoriyi seçin.
        </TipBox>
      </View>

      <Button
        label="Konuyu paylaş"
        icon={Send}
        size="lg"
        className="mt-6 w-full"
        loading={createMut.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
