import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";

type GoogleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

export function GoogleSignInButton({
  onPress,
  loading = false,
  label = "Google ile devam et",
}: GoogleSignInButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className="flex-row items-center justify-center rounded-xl border border-border bg-surface py-3.5"
    >
      {loading ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <View className="flex-row items-center gap-3">
          <AntDesign name="google" size={20} color="#DB4437" />
          <Text className="text-base font-medium text-text">{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
