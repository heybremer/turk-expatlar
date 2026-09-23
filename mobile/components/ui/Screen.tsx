import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
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
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={refreshControl}
      contentContainerStyle={[
        { padding: 16, paddingBottom: insets.bottom + 28 },
        contentContainerStyle,
      ]}
      className="flex-1"
    >
      <View className={contentClassName}>{children}</View>
    </ScrollView>
  ) : (
    <View className={`flex-1 ${contentClassName}`} style={contentContainerStyle}>
      {children}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {header ?? (title ? <DetailHeader title={title} subtitle={subtitle} action={action} /> : null)}
      {keyboardAware || keyboard ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

export { DetailHeader };
