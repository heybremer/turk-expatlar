import { useRef, useState } from "react";
import { Alert, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Building2, Euro, FileText, Languages, Link2, Mail } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { ChipRow, IconTile, SectionLabel, Segmented, TipBox } from "@/components/ui/kit";

type ListingType = "EMPLOYER" | "SEEKER";
type ContactMethod = "EMAIL" | "EXTERNAL_URL" | "PLATFORM";

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "EMPLOYER", label: "İşveren ilanı" },
  { value: "SEEKER", label: "İş arıyorum" },
];
const JOB_TYPES = [
  { value: "FULL_TIME", label: "Tam zamanlı" },
  { value: "PART_TIME", label: "Yarı zamanlı" },
  { value: "MINIJOB", label: "Minijob" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "INTERNSHIP", label: "Staj" },
  { value: "FREELANCE", label: "Freelance" },
];
const WORK_MODES = [
  { value: "ONSITE", label: "İşyerinde" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hibrit" },
];
const JOB_CATEGORIES = [
  { value: "yazilim", label: "Yazılım & IT" },
  { value: "muhendislik", label: "Mühendislik" },
  { value: "gastronomi", label: "Gastronomi & Turizm" },
  { value: "saglik", label: "Sağlık" },
  { value: "egitim", label: "Eğitim" },
  { value: "lojistik", label: "Lojistik & Depo" },
  { value: "satis", label: "Satış & Pazarlama" },
  { value: "ofis", label: "Ofis & İdari" },
  { value: "ticaret", label: "Ticaret & Perakende" },
  { value: "diger", label: "Diğer" },
];
const GERMAN_LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2", "Anadil"].map((l) => ({ value: l, label: l || "Belirtme" }));
const CONTACT_METHODS: { value: ContactMethod; label: string }[] = [
  { value: "EMAIL", label: "E-posta" },
  { value: "EXTERNAL_URL", label: "Link" },
  { value: "PLATFORM", label: "Mesaj" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function YeniIsIlani() {
  const { token } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [listingType, setListingType] = useState<ListingType>("EMPLOYER");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [briefInfo, setBriefInfo] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [category, setCategory] = useState("diger");
  const [jobType, setJobType] = useState("FULL_TIME");
  const [workMode, setWorkMode] = useState("ONSITE");
  const [salaryRange, setSalaryRange] = useState("");
  const [germanLevel, setGermanLevel] = useState("");
  const [turkishFriendly, setTurkishFriendly] = useState(false);
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const titleRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);
  const salaryRef = useRef<TextInput>(null);

  const isSeeker = listingType === "SEEKER";

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => api.get<FederalState[]>("/locations/states"),
    staleTime: 60 * 60 * 1000,
  });
  const selectedState = states?.find((s) => s.id === stateId);

  const cv = cvUrl.trim();
  const contact = contactValue.trim();
  const errors = {
    company: !isSeeker && company.trim().length < 2 ? "Şirket / işveren adı zorunludur." : undefined,
    title: title.trim().length < 5 ? "Başlık en az 5 karakter olmalı." : undefined,
    description:
      !isSeeker && description.trim().length < 30
        ? `Açıklama en az 30 karakter olmalı (${description.trim().length}/30).`
        : undefined,
    briefInfo: isSeeker && briefInfo.trim().length < 10 ? "Kısa bilgi en az 10 karakter olmalı." : undefined,
    cvUrl: isSeeker && !isHttpUrl(cv) ? "CV dosyanın paylaşım bağlantısını (https://…) girin." : undefined,
    contactValue:
      contactMethod === "EMAIL" && !EMAIL_RE.test(contact)
        ? "Geçerli bir e-posta adresi girin."
        : contactMethod === "EXTERNAL_URL" && !isHttpUrl(contact)
          ? "Geçerli bir adres girin (https://…)."
          : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const createMut = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(
        "/jobs",
        {
          listingType,
          company: isSeeker ? undefined : company.trim(),
          title: title.trim(),
          description: isSeeker ? briefInfo.trim() : description.trim(),
          briefInfo: isSeeker ? briefInfo.trim() : undefined,
          cvUrl: isSeeker ? cv : undefined,
          cvFileName: isSeeker ? "CV" : undefined,
          category,
          jobType,
          workMode,
          stateId: stateId || undefined,
          cityId: cityId || undefined,
          salaryRange: salaryRange.trim() || undefined,
          turkishFriendly: isSeeker ? false : turkishFriendly,
          germanLevel: germanLevel || undefined,
          contactMethod,
          contactValue: contactMethod === "PLATFORM" ? undefined : contact,
        },
        token,
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      Alert.alert("İlanın alındı", "İlanın moderasyon onayından sonra yayınlanacak.");
      router.replace(`/isler/${res.id}`);
    },
    onError: (error) => Alert.alert("İlan oluşturulamadı", error instanceof Error ? error.message : "Tekrar deneyin."),
  });

  const submit = () => {
    setSubmitted(true);
    if (hasErrors) return;
    createMut.mutate();
  };

  return (
    <Screen title="İlan Ver" subtitle="İş ilanı veya iş arayışı paylaş" keyboardAware>
      <Text className="mb-2 text-sm font-semibold text-text">İlan türü</Text>
      <Segmented options={LISTING_TYPES} value={listingType} onChange={setListingType} className="mb-5" />

      {!isSeeker ? (
        <TextField
          label="Şirket / İşveren"
          icon={Building2}
          value={company}
          onChangeText={setCompany}
          placeholder="Şirket adı"
          returnKeyType="next"
          onSubmitEditing={() => titleRef.current?.focus()}
          submitBehavior="submit"
          error={show("company")}
        />
      ) : null}
      <TextField
        ref={titleRef}
        label={isSeeker ? "Aradığın pozisyon" : "Pozisyon başlığı"}
        icon={Briefcase}
        value={title}
        onChangeText={setTitle}
        placeholder={isSeeker ? "Örn: Yazılım geliştirici olarak iş arıyorum" : "Örn: Aşçı (m/w/d)"}
        returnKeyType="next"
        onSubmitEditing={() => descRef.current?.focus()}
        submitBehavior="submit"
        maxLength={150}
        error={show("title")}
      />
      {isSeeker ? (
        <>
          <TextField
            ref={descRef}
            label="Kısa bilgi"
            value={briefInfo}
            onChangeText={setBriefInfo}
            placeholder="Deneyimin, becerilerin, aradığın iş türü…"
            multiline
            maxLength={2000}
            hint="En az 10 karakter"
            error={show("briefInfo")}
          />
          <TextField
            label="CV bağlantısı"
            icon={FileText}
            value={cvUrl}
            onChangeText={setCvUrl}
            placeholder="https://drive.google.com/…"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            hint="CV'ni Google Drive, Dropbox vb. ile paylaşıp bağlantısını yapıştır. Dosya yüklemek için web sitesini kullanabilirsin."
            error={show("cvUrl")}
          />
        </>
      ) : (
        <TextField
          ref={descRef}
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Görev tanımı, aranan nitelikler, çalışma saatleri…"
          multiline
          maxLength={5000}
          hint="En az 30 karakter"
          error={show("description")}
        />
      )}

      <TextField
        ref={salaryRef}
        label={isSeeker ? "Maaş beklentisi" : "Maaş aralığı"}
        hint="İsteğe bağlı"
        icon={Euro}
        value={salaryRange}
        onChangeText={setSalaryRange}
        placeholder="2.500–3.000 € brüt/ay"
        returnKeyType="done"
      />

      <SectionLabel>Kategori</SectionLabel>
      <ChipRow options={JOB_CATEGORIES} value={category} onChange={setCategory} />

      <SectionLabel>Çalışma tipi</SectionLabel>
      <ChipRow options={JOB_TYPES} value={jobType} onChange={setJobType} />

      <SectionLabel>Çalışma şekli</SectionLabel>
      <ChipRow options={WORK_MODES} value={workMode} onChange={setWorkMode} />

      <SectionLabel>Almanca seviyesi</SectionLabel>
      <ChipRow options={GERMAN_LEVELS} value={germanLevel} onChange={setGermanLevel} />

      <SectionLabel>Eyalet (isteğe bağlı)</SectionLabel>
      <ChipRow
        options={[{ value: "", label: "Belirtme" }, ...(states ?? []).map((s) => ({ value: s.id, label: s.name }))]}
        value={stateId}
        onChange={(v) => {
          setStateId(v);
          setCityId("");
        }}
      />
      {selectedState ? (
        <>
          <SectionLabel>Şehir</SectionLabel>
          <ChipRow
            options={[{ value: "", label: "Belirtme" }, ...selectedState.cities.map((c) => ({ value: c.id, label: c.name }))]}
            value={cityId}
            onChange={setCityId}
          />
        </>
      ) : null}

      {!isSeeker ? (
        <Card className="mt-6">
          <View className="flex-row items-center gap-3">
            <IconTile icon={Languages} size={40} />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-text">Türkçe konuşan tercih edilir</Text>
              <Text className="text-xs text-muted">İlanda "Türkçe işveren" rozeti gösterilir</Text>
            </View>
            <Switch
              value={turkishFriendly}
              onValueChange={setTurkishFriendly}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
              accessibilityLabel="Türkçe konuşan tercih edilir"
            />
          </View>
        </Card>
      ) : null}

      <SectionLabel>{isSeeker ? "Sana nasıl ulaşılsın?" : "Başvuru yöntemi"}</SectionLabel>
      <Segmented options={CONTACT_METHODS} value={contactMethod} onChange={setContactMethod} className="mb-4" />
      {contactMethod === "EMAIL" ? (
        <TextField
          label="E-posta"
          icon={Mail}
          value={contactValue}
          onChangeText={setContactValue}
          placeholder="ornek@mail.de"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          error={show("contactValue")}
        />
      ) : contactMethod === "EXTERNAL_URL" ? (
        <TextField
          label="Başvuru linki"
          icon={Link2}
          value={contactValue}
          onChangeText={setContactValue}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          error={show("contactValue")}
        />
      ) : (
        <View className="mb-4">
          <TipBox>İlgilenenler sana uygulama içinden mesaj gönderir.</TipBox>
        </View>
      )}

      <Text className="mb-2 mt-2 text-xs leading-5 text-muted">
        İlanlar moderasyon onayından sonra yayınlanır ve 60 gün yayında kalır.
      </Text>
      <Button
        label="İlanı gönder"
        size="lg"
        loading={createMut.isPending}
        disabled={submitted && hasErrors}
        onPress={submit}
      />
    </Screen>
  );
}
