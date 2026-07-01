import { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/ui/BackButton";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
};

/** Geri butonlu, safe-area'ya duyarlı standart alt sayfa başlığı. Tüm detay/form ekranlarında kullanılır. */
export function DetailHeader({ title, subtitle, action, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3"
      style={{ paddingTop: insets.top + 10 }}
    >
      <BackButton onPress={onBack} />
      <View className="flex-1">
        <Text className="text-base font-bold text-text" numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text className="text-xs text-muted" numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
      {action}
    </View>
  );
}
