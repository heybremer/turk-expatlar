import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
};

/** Veri yüklenemediğinde gösterilen standart hata ekranı (yeniden dene butonlu). */
export function ErrorState({
  title = "Bir şeyler ters gitti",
  subtitle = "İçerik yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.",
  onRetry,
}: Props) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-danger/10">
        <Ionicons name="cloud-offline-outline" size={30} color="#dc2626" />
      </View>
      <Text className="text-lg font-semibold text-text text-center mb-2">{title}</Text>
      <Text className="text-sm text-muted text-center mb-5">{subtitle}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.8}
          className="bg-primary rounded-xl px-6 py-3"
        >
          <Text className="text-white font-semibold">Tekrar Dene</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
