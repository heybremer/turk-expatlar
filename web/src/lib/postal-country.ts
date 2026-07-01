export type PostalCountry = "DE" | "TR";

export const COUNTRY_FLAGS: Record<PostalCountry, string> = {
  DE: "🇩🇪",
  TR: "🇹🇷",
};

export const COUNTRY_LABELS: Record<PostalCountry, string> = {
  DE: "Almanya",
  TR: "Türkiye",
};

export function isValidGermanPostalCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

export function isValidTurkishPostalCode(code: string): boolean {
  if (!/^\d{5}$/.test(code)) return false;
  const prefix = parseInt(code.slice(0, 2), 10);
  return prefix >= 1 && prefix <= 81;
}
