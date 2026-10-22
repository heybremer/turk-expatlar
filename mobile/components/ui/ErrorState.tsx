import { Text, View } from "react-native";
import { CloudOff, RotateCw } from "lucide-react-native";
import { colors } from "@/lib/colors";
import { Button } from "./Button";

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
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-danger/10">
        <CloudOff size={28} color={colors.danger} />
      </View>
      <Text className="mb-1.5 text-center text-lg font-bold text-text">{title}</Text>
      <Text className="mb-5 text-center text-sm leading-5 text-muted">{subtitle}</Text>
      {onRetry ? <Button label="Tekrar dene" icon={RotateCw} onPress={onRetry} size="sm" /> : null}
    </View>
  );
}
