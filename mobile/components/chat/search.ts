const TR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i̇: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  ä: "a",
  ß: "ss",
};

/** Türkçe/Almanca karakterleri sadeleştirerek büyük/küçük harf duyarsız arama anahtarı üretir. */
export function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/i̇|[çğıöşüäß]/g, (ch) => TR_MAP[ch] ?? ch)
    .trim();
}
