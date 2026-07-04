import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LevelProgress } from "@/lib/api";

type Props = {
  levelProgress: LevelProgress;
  compact?: boolean;
};

/** Kullanıcının seviye/puan durumunu gösteren rozet/kart. */
export function LevelCard({ levelProgress, compact = false }: Props) {
  const { level, points, maxLevel, pointsToNextLevel, progress } = levelProgress;
  const isMax = level >= maxLevel;

  if (compact) {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
        <Ionicons name="trophy" size={12} color="#1a56db" />
        <Text className="text-xs font-semibold text-primary">Seviye {level}</Text>
      </View>
    );
  }

  return (
    <View className="w-full rounded-2xl bg-background px-4 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="trophy" size={16} color="#1a56db" />
          </View>
          <View>
            <Text className="text-sm font-bold text-text">Seviye {level}</Text>
            <Text className="text-xs text-muted">{points} puan{isMax ? " · en yüksek seviye" : ""}</Text>
          </View>
        </View>
        {!isMax && (
          <Text className="text-xs text-muted text-right">
            <Text className="font-semibold text-text">{pointsToNextLevel}</Text>{"\n"}sonraki seviyeye
          </Text>
        )}
      </View>
      {!isMax && (
        <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
      )}
    </View>
  );
}
