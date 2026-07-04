/**
 * Seviye 1'den 100'e kadar giden puan eğrisi.
 * Her seviye bir öncekinden biraz daha fazla puan gerektirir, böylece erken
 * seviyeler hızlı geçilirken ileri seviyeler gerçek bir hedef haline gelir.
 */
const MAX_LEVEL = 100;

/** n. seviyeye ulaşmak için gereken toplam (kümülatif) puan. */
export function totalPointsForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(25 * Math.pow(level - 1, 1.6));
}

/** Toplam puana göre kullanıcının bulunduğu seviyeyi hesaplar (1-100 arası). */
export function levelForPoints(points: number): number {
  let level = 1;
  for (let n = 2; n <= MAX_LEVEL; n++) {
    if (points < totalPointsForLevel(n)) break;
    level = n;
  }
  return level;
}

/** Profil ekranlarında ilerleme çubuğu göstermek için kullanılan özet bilgi. */
export function getLevelProgress(points: number) {
  const level = levelForPoints(points);
  const currentLevelPoints = totalPointsForLevel(level);
  const nextLevelPoints =
    level >= MAX_LEVEL ? null : totalPointsForLevel(level + 1);
  return {
    level,
    points,
    maxLevel: MAX_LEVEL,
    currentLevelPoints,
    nextLevelPoints,
    pointsToNextLevel:
      nextLevelPoints === null ? 0 : Math.max(0, nextLevelPoints - points),
    progress:
      nextLevelPoints === null
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (points - currentLevelPoints) /
                (nextLevelPoints - currentLevelPoints),
            ),
          ),
  };
}
