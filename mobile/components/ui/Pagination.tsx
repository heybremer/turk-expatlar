import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <View className="flex-row items-center justify-center gap-3 mt-4 mb-2">
      <TouchableOpacity
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        className={`flex-row items-center gap-1 px-4 py-2 rounded-xl border border-border ${page <= 1 ? "opacity-30" : ""}`}
      >
        <Ionicons name="chevron-back" size={14} color="#1f2937" />
        <Text className="text-sm text-text">Önceki</Text>
      </TouchableOpacity>
      <View className="px-4 py-2 items-center justify-center">
        <Text className="text-sm text-muted">{page} / {totalPages}</Text>
      </View>
      <TouchableOpacity
        disabled={page >= totalPages}
        onPress={() => onChange(page + 1)}
        className={`flex-row items-center gap-1 px-4 py-2 rounded-xl border border-border ${page >= totalPages ? "opacity-30" : ""}`}
      >
        <Text className="text-sm text-text">Sonraki</Text>
        <Ionicons name="chevron-forward" size={14} color="#1f2937" />
      </TouchableOpacity>
    </View>
  );
}
