import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  icon?: IconName;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon = "search-outline", title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-background">
        <Ionicons name={icon} size={30} color="#9ca3af" />
      </View>
      <Text className="text-lg font-semibold text-text text-center mb-2">{title}</Text>
      {subtitle && <Text className="text-sm text-muted text-center">{subtitle}</Text>}
    </View>
  );
}
