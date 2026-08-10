import type { FederalState } from "@/lib/api";

export type DePlzResult = {
  found: boolean;
  localityName?: string;
  municipalityName?: string;
  stateName?: string;
  state?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

function normalizeDeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchCity(
  cities: { id: string; name: string }[],
  ...names: (string | undefined)[]
): { id: string; name: string } | undefined {
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

export function resolvePlzFromStates(
  res: DePlzResult,
  states: FederalState[],
): { stateId?: string; stateName?: string; cityId?: string; cityName?: string } | null {
  if (!res.found) return null;

  let stateId = res.state?.id;
  let stateName = res.state?.name;
  if (!stateId && res.stateName) {
    const matched = states.find(
      (s) =>
        s.name === res.stateName ||
        normalizeDeName(s.name) === normalizeDeName(res.stateName!),
    );
    if (matched) {
      stateId = matched.id;
      stateName = matched.name;
    }
  }
  if (!stateId) return null;

  const matchedState = states.find((s) => s.id === stateId);
  let cityId = res.city?.id;
  let cityName = res.city?.name;

  if (!cityId && matchedState?.cities?.length) {
    const city = matchCity(
      matchedState.cities,
      res.localityName,
      res.municipalityName,
    );
    if (city) {
      cityId = city.id;
      cityName = city.name;
    }
  }
  if (!cityName && cityId && matchedState?.cities) {
    cityName = matchedState.cities.find((c) => c.id === cityId)?.name;
  }

  return { stateId, stateName, cityId, cityName };
}
