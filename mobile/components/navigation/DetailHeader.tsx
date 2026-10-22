import { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/ui/BackButton";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  /** Başlığın altında (arama, sekme vb.) gösterilecek ek içerik. */
  children?: ReactNode;
};

/** Geri butonlu, safe-area'ya duyarlı standart alt sayfa başlığı. Tüm detay/form ekranlarında kullanılır. */
export function DetailHeader({ title, subtitle, action, onBack, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-surface px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
      <View className="min-h-11 flex-row items-center gap-3">
        <BackButton onPress={onBack} />
        <View className="flex-1">
          <Text className="text-[17px] font-bold text-text" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View className="flex-row items-center gap-2">{action}</View> : null}
      </View>
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}
