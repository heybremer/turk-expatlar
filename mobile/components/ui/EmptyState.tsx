import { Text, View } from "react-native";
import { Inbox, type LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/colors";
import { Button } from "./Button";

type Props = {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon = Inbox, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
        <Icon size={28} color={colors.primary} strokeWidth={2} />
      </View>
      <Text className="mb-1.5 text-center text-lg font-bold text-text">{title}</Text>
      {subtitle ? <Text className="text-center text-sm leading-5 text-muted">{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="soft" size="sm" className="mt-5" />
      ) : null}
    </View>
  );
}
