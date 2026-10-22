import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { colors } from "@/lib/colors";

type Props = Omit<TouchableOpacityProps, "onPress"> & {
  onPress?: () => void;
  color?: string;
  size?: number;
};

export function BackButton({ onPress, color = colors.text, size = 22, ...rest }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/akis")))}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-background"
      {...rest}
    >
      <ChevronLeft size={size} color={color} strokeWidth={2.4} />
    </TouchableOpacity>
  );
}
