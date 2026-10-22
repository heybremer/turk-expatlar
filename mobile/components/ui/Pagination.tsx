import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <View className="mb-2 mt-4 flex-row items-center justify-center gap-3">
      <Pressable
        disabled={prevDisabled}
        onPress={() => onChange(page - 1)}
        accessibilityLabel="Önceki sayfa"
        className={`h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface active:bg-background ${
          prevDisabled ? "opacity-30" : "opacity-100"
        }`}
      >
        <ChevronLeft size={18} color={colors.text} />
      </Pressable>
      <View className="min-w-20 items-center rounded-2xl bg-surface px-4 py-2.5">
        <Text className="text-sm font-semibold text-text">
          {page} <Text className="font-normal text-muted">/ {totalPages}</Text>
        </Text>
      </View>
      <Pressable
        disabled={nextDisabled}
        onPress={() => onChange(page + 1)}
        accessibilityLabel="Sonraki sayfa"
        className={`h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface active:bg-background ${
          nextDisabled ? "opacity-30" : "opacity-100"
        }`}
      >
        <ChevronRight size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}
