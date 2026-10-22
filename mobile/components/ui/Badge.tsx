import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Color = "primary" | "success" | "warning" | "danger" | "accent" | "muted";

const COLOR_MAP: Record<Color, { bg: string; text: string; icon: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", icon: colors.primary },
  success: { bg: "bg-success/10", text: "text-success", icon: colors.success },
  warning: { bg: "bg-warning/10", text: "text-warning", icon: colors.warning },
  danger: { bg: "bg-danger/10", text: "text-danger", icon: colors.danger },
  accent: { bg: "bg-accent/10", text: "text-accent", icon: colors.accent },
  muted: { bg: "bg-background", text: "text-muted", icon: colors.muted },
};

type Props = {
  label: string;
  color?: Color;
  icon?: LucideIcon;
};

export function Badge({ label, color = "primary", icon: Icon }: Props) {
  const { bg, text, icon } = COLOR_MAP[color];
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${bg}`}>
      {Icon ? <Icon size={12} color={icon} strokeWidth={2.4} /> : null}
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}
