import { forwardRef, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TextInputProps, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, MapPin } from "lucide-react-native";

import { TextField } from "@/components/ui/TextField";
import { ChipRow, Segmented } from "@/components/ui/kit";
import { api, FederalState } from "@/lib/api";
import { colors } from "@/lib/colors";

export type PostalCountry = "DE" | "TR";

export type PostalLocation = {
  postalCountry: PostalCountry;
  postalCode: string;
  stateId: string;
  cityId: string;
};

export type PostalLocationErrors = { postalCode?: string; location?: string };

export const EMPTY_POSTAL_LOCATION: PostalLocation = {
  postalCountry: "DE",
  postalCode: "",
  stateId: "",
  cityId: "",
};

const COUNTRY_OPTIONS: { value: PostalCountry; label: string }[] = [
  { value: "DE", label: "🇩🇪 Almanya" },
  { value: "TR", label: "🇹🇷 Türkiye" },
];

type DePlzResult = {
  found: boolean;
  localityName?: string;
  municipalityName?: string;
  stateName?: string;
  state?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

type TrPlzResult = { found: boolean; provinceName?: string | null };

type LookupStatus = "idle" | "loading" | "found" | "not_found" | "error";

function normalizeDeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchCity(cities: { id: string; name: string }[], ...names: (string | undefined)[]) {
  const candidates = names
    .flatMap((n) => [n, n?.split(/[\s,/(-]/)[0]])
    .map((n) => n?.trim())
    .filter((n): n is string => !!n);
  for (const candidate of candidates) {
    const norm = normalizeDeName(candidate);
    const exact = cities.find((c) => normalizeDeName(c.name) === norm);
    if (exact) return exact;
    const prefix = cities.find((c) => {
      const cn = normalizeDeName(c.name);
      return cn.startsWith(norm) || norm.startsWith(cn);
    });
    if (prefix) return prefix;
  }
  return undefined;
}

function resolvePlz(res: DePlzResult, states: FederalState[]) {
  if (!res.found) return null;
  let stateId = res.state?.id;
  let stateName = res.state?.name;
  if (!stateId && res.stateName) {
    const matched = states.find((s) => normalizeDeName(s.name) === normalizeDeName(res.stateName!));
    stateId = matched?.id;
    stateName = matched?.name;
  }
  if (!stateId) return null;
  const state = states.find((s) => s.id === stateId);
  let cityId = res.city?.id;
  let cityName = res.city?.name;
  if (!cityId && state?.cities?.length) {
    const city = matchCity(state.cities, res.localityName, res.municipalityName);
    cityId = city?.id;
    cityName = city?.name;
  }
  return { stateId, stateName: stateName ?? state?.name, cityId, cityName };
}

/** Kayıt ve hoş geldin ekranlarındaki posta kodu doğrulaması (backend kurallarıyla aynı). */
export function validatePostalLocation(value: PostalLocation): PostalLocationErrors {
  const errors: PostalLocationErrors = {};
  if (!/^\d{5}$/.test(value.postalCode)) {
    errors.postalCode = "Geçerli bir 5 haneli posta kodu gir.";
  } else if (value.postalCountry === "DE" && (!value.stateId || !value.cityId)) {
    errors.location = "Almanya için eyalet ve şehir seçimi gerekli.";
  }
  return errors;
}

type Props = {
  value: PostalLocation;
  onChange: (patch: Partial<PostalLocation>) => void;
  errors?: PostalLocationErrors;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
};

/** Ülke seçimi + posta kodu; Almanya için eyalet/şehri posta kodundan otomatik doldurur. */
export const PostalLocationFields = forwardRef<TextInput, Props>(function PostalLocationFields(
  { value, onChange, errors, returnKeyType = "done", onSubmitEditing },
  ref,
) {
  const { postalCountry, postalCode, stateId, cityId } = value;
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [label, setLabel] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const statesQuery = useQuery({
    queryKey: ["locations", "states"],
    queryFn: () => api.get<FederalState[]>("/locations/states"),
    enabled: postalCountry === "DE",
    staleTime: 60 * 60 * 1000,
  });
  const states = statesQuery.data ?? [];
  const statesRef = useRef(states);
  statesRef.current = states;
  const selectedState = states.find((s) => s.id === stateId);

  useEffect(() => {
    setLabel("");
    if (postalCode.length !== 5) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (postalCountry === "DE") {
          const res = await api.get<DePlzResult>(`/locations/postal/${postalCode}`);
          if (cancelled) return;
          const resolved = resolvePlz(res, statesRef.current);
          if (resolved) {
            onChangeRef.current({ stateId: resolved.stateId, cityId: resolved.cityId ?? "" });
            setLabel(
              [res.localityName, resolved.stateName].filter(Boolean).join(", "),
            );
            setStatus("found");
          } else {
            setLabel(res.found ? res.localityName ?? "" : "");
            setStatus("not_found");
          }
        } else {
          const res = await api.get<TrPlzResult>(`/locations/postal/tr/${postalCode}`);
          if (cancelled) return;
          setLabel(res.provinceName ?? "");
          setStatus(res.found && res.provinceName ? "found" : "not_found");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [postalCode, postalCountry, statesQuery.isSuccess]);

  const hint =
    status === "loading"
      ? "Posta kodu kontrol ediliyor…"
      : status === "not_found"
        ? postalCountry === "DE"
          ? "Posta kodu eşleşmedi. Eyalet ve şehri aşağıdan seç."
          : "Geçerli bir Türkiye posta kodu gir."
        : status === "error"
          ? postalCountry === "DE"
            ? "Posta kodu doğrulanamadı. Eyalet ve şehri aşağıdan seç."
            : "Posta kodu doğrulanamadı. Tekrar dene."
          : postalCountry === "DE"
            ? "5 haneli posta kodu — eyalet ve şehir otomatik dolar."
            : "Türkiye'den kayıtlı üyeler yalnızca izin verilen bölümlere erişebilir.";

  return (
    <View>
      <Text className="mb-1.5 text-sm font-semibold text-text">Bulunduğun ülke</Text>
      <Segmented
        options={COUNTRY_OPTIONS}
        value={postalCountry}
        onChange={(country) => {
          if (country === postalCountry) return;
          onChange({ postalCountry: country, postalCode: "", stateId: "", cityId: "" });
        }}
        className="mb-4 border border-border"
      />

      <TextField
        ref={ref}
        label="Posta kodu"
        icon={MapPin}
        value={postalCode}
        onChangeText={(text) => onChange({ postalCode: text.replace(/\D/g, "").slice(0, 5) })}
        placeholder={postalCountry === "DE" ? "10115" : "34000"}
        keyboardType="number-pad"
        maxLength={5}
        autoComplete="postal-code"
        textContentType="postalCode"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        error={errors?.postalCode}
        hint={status === "found" ? undefined : hint}
        containerClassName={status === "found" ? "mb-2" : ""}
      />
      {status === "found" && label ? (
        <View className="-mt-1 mb-4 flex-row items-center gap-1.5">
          <CircleCheck size={14} color={colors.success} />
          <Text className="flex-1 text-xs font-medium text-success">{label}</Text>
        </View>
      ) : null}

      {postalCountry === "DE" ? (
        <View className="mb-4">
          <Text className="mb-2 text-sm font-semibold text-text">Eyalet</Text>
          {statesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start" }} />
          ) : statesQuery.isError ? (
            <Text className="text-xs text-danger">Eyaletler yüklenemedi. Bağlantını kontrol et.</Text>
          ) : (
            <ChipRow
              options={states.map((s) => ({ value: s.id, label: s.name }))}
              value={stateId}
              onChange={(id) => onChange({ stateId: id, cityId: "" })}
            />
          )}
          {selectedState ? (
            <>
              <Text className="mb-2 mt-4 text-sm font-semibold text-text">Şehir</Text>
              <ChipRow
                options={selectedState.cities.map((c) => ({ value: c.id, label: c.name }))}
                value={cityId}
                onChange={(id) => onChange({ cityId: id })}
              />
            </>
          ) : null}
          {errors?.location ? (
            <Text className="mt-2 text-xs font-medium text-danger">{errors.location}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});
