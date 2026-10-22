import { Text, View } from "react-native";
import { Award } from "lucide-react-native";
import type { LevelProgress } from "@/lib/api";
import { colors } from "@/lib/colors";

type Props = {
  levelProgress: LevelProgress;
  compact?: boolean;
};

/** Kullanıcının seviye/puan durumunu gösteren rozet/kart. */
export function LevelCard({ levelProgress, compact = false }: Props) {
  const level = Number(levelProgress?.level) || 1;
  const points = Number(levelProgress?.points) || 0;
  const maxLevel = Number(levelProgress?.maxLevel) || 100;
  const pointsToNextLevel = Math.max(0, Number(levelProgress?.pointsToNextLevel) || 0);
  const rawProgress = Number(levelProgress?.progress);
  const progress = Number.isFinite(rawProgress) ? Math.min(1, Math.max(0, rawProgress)) : 0;
  const isMax = level >= maxLevel || levelProgress?.nextLevelPoints === null;
  const percent = Math.round(progress * 100);

  if (compact) {
    return (
      <View
        className="flex-row items-center gap-1 self-start rounded-full bg-primary/10 px-2.5 py-1"
        accessible
        accessibilityLabel={`Seviye ${level}`}
      >
        <Award size={12} color={colors.primary} strokeWidth={2.4} />
        <Text className="text-xs font-semibold text-primary">Seviye {level}</Text>
      </View>
    );
  }

  return (
    <View
      className="w-full rounded-2xl bg-background p-4"
      accessible
      accessibilityLabel={
        isMax
          ? `Seviye ${level}, ${points} puan, en yüksek seviye`
          : `Seviye ${level}, ${points} puan, sonraki seviyeye ${pointsToNextLevel} puan`
      }
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Award size={20} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-text">Seviye {level}</Text>
            <Text className="text-xs text-muted">
              {points.toLocaleString("tr-TR")} puan{isMax ? " · en yüksek seviye" : ""}
            </Text>
          </View>
        </View>
        {!isMax && (
          <Text className="text-right text-xs text-muted">
            <Text className="font-bold text-text">{pointsToNextLevel.toLocaleString("tr-TR")}</Text>
            {"\n"}sonraki seviyeye
          </Text>
        )}
      </View>
      {!isMax && (
        <View
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
        >
          <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </View>
      )}
    </View>
  );
}
