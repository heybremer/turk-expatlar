/**
 * CORS_ORIGIN env'inden izin verilen origin listesini üretir.
 * Virgülle ayrılmış çoklu değer destekler; boşlukları temizler.
 *
 * Örnek: "https://turkexpatlar.de,https://www.turkexpatlar.de"
 */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return ['http://localhost:3200'];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
