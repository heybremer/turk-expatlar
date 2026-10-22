import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  Heart,
  Lightbulb,
  Mail,
  MessagesSquare,
  MoreHorizontal,
  Send,
  Sparkles,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Screen } from "@/components/ui/Screen";
import { LinkRow, SectionLabel, ToolHero } from "@/components/ui/kit";

type Category = "TECHNICAL" | "SUGGESTION" | "REQUEST" | "COMPLAINT" | "OTHER";
type Ticket = { id: string; category: Category; subject: string; status: string; createdAt: string };

const CATEGORIES: ReadonlyArray<{ value: Category; label: string; icon: LucideIcon }> = [
  { value: "TECHNICAL", label: "Teknik sorun", icon: Wrench },
  { value: "SUGGESTION", label: "Öneri", icon: Lightbulb },
  { value: "REQUEST", label: "İstek", icon: Sparkles },
  { value: "COMPLAINT", label: "Şikayet", icon: CircleAlert },
  { value: "OTHER", label: "Diğer", icon: MoreHorizontal },
];
const SUBJECT_MIN = 5;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 5000;

export default function SupportScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<Category>("SUGGESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sent, setSent] = useState<Ticket | null>(null);
  const messageRef = useRef<TextInput>(null);

  const { data: myTickets } = useQuery({
    queryKey: ["support-mine"],
    queryFn: () => api.get<Ticket[]>("/support/mine", token),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Ticket>("/support", { category, subject: subject.trim(), message: message.trim() }, token),
    onSuccess: (ticket) => {
      setSent(ticket);
      void queryClient.invalidateQueries({ queryKey: ["support-mine"] });
      setSubject("");
      setMessage("");
      setCategory("SUGGESTION");
      setSubmitted(false);
    },
    onError: (error) => setServerError(error instanceof ApiError ? error.message : "Lütfen tekrar deneyin."),
  });

  const subjectError =
    subject.trim().length < SUBJECT_MIN ? `Konu en az ${SUBJECT_MIN} karakter olmalı` : null;
  const messageError =
    message.trim().length < MESSAGE_MIN ? `Mesaj en az ${MESSAGE_MIN} karakter olmalı` : null;

  const submit = () => {
    setSubmitted(true);
    setServerError("");
    if (subjectError || messageError || mutation.isPending) return;
    mutation.mutate();
  };

  if (sent) {
    return (
      <Screen title="Destek" subtitle="Sorun, öneri ve isteklerinizi iletin">
        <Card className="items-center p-6">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-success/10">
            <CircleCheck size={30} color={colors.success} />
          </View>
          <Text className="mt-4 text-center text-lg font-extrabold text-text">Teşekkür ederiz!</Text>
          <Text className="mt-1.5 text-center text-sm leading-5 text-muted">
            Mesajın ekibimize iletildi. Gerekirse e-posta adresin üzerinden sana dönüş yapacağız.
          </Text>
          <View className="mt-4 w-full rounded-2xl bg-background p-4">
            <Text className="text-xs text-muted">Konu</Text>
            <Text className="mt-0.5 text-[15px] font-semibold text-text">{sent.subject}</Text>
            <Text className="mt-2 text-xs text-muted">
              Talep no: <Text className="font-semibold text-text">{sent.id.slice(-8).toUpperCase()}</Text>
            </Text>
          </View>
          <View className="mt-5 w-full gap-2">
            <Button label="Yeni mesaj yaz" variant="soft" onPress={() => setSent(null)} />
            <Button label="Geri dön" variant="ghost" onPress={() => router.back()} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Destek" subtitle="Sorun, öneri ve isteklerinizi iletin" keyboardAware>
      <ToolHero
        icon={Heart}
        tint={colors.accent}
        title="Birlikte geliştirelim"
        subtitle="Her mesaj incelenir. İçerik veya kullanıcı şikâyetlerinde ilgili içerikteki şikâyet menüsünü kullanın."
      />

      <SectionLabel>Kategori</SectionLabel>
      <View className="flex-row flex-wrap gap-2">
        {CATEGORIES.map((item) => {
          const selected = item.value === category;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.value}
              onPress={() => setCategory(item.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              className={`min-h-11 flex-row items-center gap-2 rounded-full border px-4 active:opacity-70 ${
                selected ? "border-primary bg-primary" : "border-border bg-surface"
              }`}
            >
              <Icon size={16} color={selected ? colors.white : colors.muted} />
              <Text className={`text-sm font-semibold ${selected ? "text-white" : "text-muted"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Mesaj</SectionLabel>
      <Card>
        <TextField
          label="Konu başlığı"
          value={subject}
          onChangeText={setSubject}
          maxLength={SUBJECT_MAX}
          placeholder="Kısa ve açıklayıcı bir başlık"
          icon={Tag}
          autoCapitalize="sentences"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => messageRef.current?.focus()}
          hint={`En az ${SUBJECT_MIN} karakter`}
          error={submitted ? subjectError : null}
        />
        <TextField
          ref={messageRef}
          label="Mesajınız"
          value={message}
          onChangeText={setMessage}
          maxLength={MESSAGE_MAX}
          multiline
          autoCapitalize="sentences"
          placeholder="Ne yaşadığınızı veya önerinizi ayrıntılı yazın…"
          hint={`En az ${MESSAGE_MIN} karakter · ${message.length}/${MESSAGE_MAX}`}
          error={submitted ? messageError : null}
          style={{ minHeight: 140 }}
          containerClassName="mb-0"
        />
      </Card>

      {serverError ? (
        <Text className="mt-4 text-center text-sm font-medium text-danger">{serverError}</Text>
      ) : null}

      <Button
        label="Mesajı gönder"
        icon={Send}
        size="lg"
        className="mt-6"
        loading={mutation.isPending}
        onPress={submit}
      />

      {myTickets && myTickets.length > 0 ? (
        <>
          <SectionLabel count={myTickets.length}>Geçmiş taleplerim</SectionLabel>
          <View className="gap-2">
            {myTickets.map((t) => (
              <Card key={t.id} className="gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-sm font-semibold text-text" numberOfLines={1}>
                    {t.subject}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ${
                      t.status === "RESOLVED" || t.status === "CLOSED" ? "text-success" : "text-warning"
                    }`}
                  >
                    {t.status === "OPEN"
                      ? "Açık"
                      : t.status === "IN_PROGRESS"
                        ? "İnceleniyor"
                        : t.status === "RESOLVED"
                          ? "Çözüldü"
                          : t.status === "CLOSED"
                            ? "Kapandı"
                            : t.status}
                  </Text>
                </View>
                <Text className="text-xs text-muted">Talep no: {t.id.slice(-8).toUpperCase()}</Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionLabel>Diğer kanallar</SectionLabel>
      <Card>
        <LinkRow icon={Mail} label="iletisim@turkexpatlar.de" url="mailto:iletisim@turkexpatlar.de" emphasis />
        <Pressable
          onPress={() => router.push("/(tabs)/forum" as never)}
          accessibilityRole="link"
          className="min-h-11 flex-row items-center gap-3 active:opacity-60"
        >
          <MessagesSquare size={17} color={colors.muted} />
          <Text className="flex-1 text-sm leading-5 text-text">Topluluğa forumda sor</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
