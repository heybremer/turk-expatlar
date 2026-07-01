import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  rating: number;
  size?: number;
  color?: string;
};

export function StarRating({ rating, size = 14, color = "#d97706" }: Props) {
  const rounded = Math.round(rating);
  return (
    <View className="flex-row items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons key={i} name={i < rounded ? "star" : "star-outline"} size={size} color={color} />
      ))}
    </View>
  );
}
