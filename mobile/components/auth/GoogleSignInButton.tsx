import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/lib/colors";

type GoogleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
};

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  label = "Google ile devam et",
}: GoogleSignInButtonProps) {
  const inactive = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Google hesabınla oturum açmak için tarayıcı açılır"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`min-h-14 flex-row items-center justify-center rounded-2xl border border-border bg-surface px-6 ${
        disabled && !loading ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
            <Text className="text-[15px] font-black text-primary">G</Text>
          </View>
          <Text className="text-base font-bold text-text">{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
