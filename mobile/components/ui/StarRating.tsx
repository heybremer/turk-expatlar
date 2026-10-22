import { View } from "react-native";
import { Star, StarHalf } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Props = {
  rating: number | null | undefined;
  size?: number;
  color?: string;
};

/** Salt-okunur 5 yıldızlı puan gösterimi (yarım yıldız destekli). */
export function StarRating({ rating, size = 14, color = colors.warning }: Props) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  const rounded = Math.round(value * 2) / 2;
  return (
    <View
      className="flex-row items-center gap-0.5"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`5 üzerinden ${value.toFixed(1)} yıldız`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const full = i + 1 <= rounded;
        const half = !full && i + 0.5 === rounded;
        if (half) {
          return (
            <View key={i} style={{ width: size, height: size }}>
              <Star size={size} color={colors.mutedLight} fill="transparent" strokeWidth={2} />
              <View style={{ position: "absolute", left: 0, top: 0 }}>
                <StarHalf size={size} color={color} fill={color} strokeWidth={2} />
              </View>
            </View>
          );
        }
        return (
          <Star
            key={i}
            size={size}
            color={full ? color : colors.mutedLight}
            fill={full ? color : "transparent"}
            strokeWidth={2}
          />
        );
      })}
    </View>
  );
}
