import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/lib/colors";

type Props = Omit<TouchableOpacityProps, "onPress"> & {
  onPress?: () => void;
  color?: string;
  size?: number;
};

export function BackButton({ onPress, color = colors.primary, size = 22, ...rest }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      <Ionicons name="arrow-back" size={size} color={color} />
    </TouchableOpacity>
  );
}
