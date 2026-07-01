import type { FederalState } from "@/lib/api";

export type DePlzResult = {
  found: boolean;
  localityName?: string;
  municipalityName?: string;
  stateName?: string;
  state?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

export function resolvePlzFromStates(
  res: DePlzResult,
  states: FederalState[],
): { stateId?: string; stateName?: string; cityId?: string; cityName?: string } | null {
  if (!res.found) return null;

  let stateId = res.state?.id;
  let stateName = res.state?.name;
  if (!stateId && res.stateName) {
    const matched = states.find((s) => s.name === res.stateName);
    if (matched) {
      stateId = matched.id;
      stateName = matched.name;
    }
  }
  if (!stateId) return null;

  const matchedState = states.find((s) => s.id === stateId);
  let cityId = res.city?.id;
  let cityName = res.city?.name;
  if (!cityId && res.localityName && matchedState?.cities?.length) {
    const loc = res.localityName.toLowerCase();
    const city = matchedState.cities.find(
      (c) =>
        c.name.toLowerCase() === loc ||
        c.name.toLowerCase().startsWith(loc) ||
        loc.startsWith(c.name.toLowerCase()),
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
