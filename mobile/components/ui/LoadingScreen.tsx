import { ActivityIndicator, Text, View } from "react-native";

export function LoadingScreen({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#1a56db" />
      <Text className="mt-3 text-sm text-muted">{label}</Text>
    </View>
  );
}
