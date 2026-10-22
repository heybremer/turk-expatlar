import { ReactNode } from "react";
import { ScrollView, ScrollViewProps, StyleProp, View, ViewStyle } from "react-native";
import { KeyboardAvoidingView, KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DetailHeader } from "@/components/navigation/DetailHeader";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  keyboard?: boolean;
  contentClassName?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps["refreshControl"];
};

/**
 * Standart sayfa iskeleti. `keyboardAware` verildiğinde odaklanan alan klavyenin
 * üstünde kalacak şekilde otomatik kaydırılır (iOS ve Android'de aynı davranış).
 */
export function Screen({
  title,
  subtitle,
  children,
  action,
  header,
  scroll = true,
  keyboardAware = false,
  keyboard = false,
  contentClassName = "",
  contentContainerStyle,
  refreshControl,
}: Props) {
  const insets = useSafeAreaInsets();
  const avoidKeyboard = keyboardAware || keyboard;
  const scrollProps = {
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "interactive" as const,
    refreshControl,
    contentContainerStyle: [{ padding: 16, paddingBottom: insets.bottom + 28 }, contentContainerStyle],
    style: { flex: 1 },
  };

  let content: ReactNode;
  if (scroll && avoidKeyboard) {
    content = (
      <KeyboardAwareScrollView {...scrollProps} bottomOffset={24}>
        <View className={contentClassName}>{children}</View>
      </KeyboardAwareScrollView>
    );
  } else if (scroll) {
    content = (
      <ScrollView {...scrollProps} contentInsetAdjustmentBehavior="automatic">
        <View className={contentClassName}>{children}</View>
      </ScrollView>
    );
  } else {
    const inner = (
      <View className={`flex-1 ${contentClassName}`} style={contentContainerStyle}>
        {children}
      </View>
    );
    content = avoidKeyboard ? (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {inner}
      </KeyboardAvoidingView>
    ) : (
      inner
    );
  }

  return (
    <View className="flex-1 bg-background">
      {header ?? (title ? <DetailHeader title={title} subtitle={subtitle} action={action} /> : null)}
      {content}
    </View>
  );
}

export { DetailHeader };
