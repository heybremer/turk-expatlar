import { Text, View } from "react-native";

type Color = "primary" | "success" | "warning" | "danger" | "muted";

const COLOR_MAP: Record<Color, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-green-100", text: "text-green-700" },
  warning: { bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { bg: "bg-red-100", text: "text-danger" },
  muted: { bg: "bg-gray-100", text: "text-muted" },
};

type Props = {
  label: string;
  color?: Color;
};

export function Badge({ label, color = "primary" }: Props) {
  const { bg, text } = COLOR_MAP[color];
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}
