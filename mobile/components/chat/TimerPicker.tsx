import { Pressable, ScrollView, Text, View } from "react-native";
import { Timer } from "lucide-react-native";
import { colors } from "@/lib/colors";

export const TIMER_OPTIONS = [
  { label: "Yok", value: 0 },
  { label: "30 sn", value: 30 },
  { label: "1 dk", value: 60 },
  { label: "5 dk", value: 300 },
  { label: "1 sa", value: 3600 },
  { label: "24 sa", value: 86400 },
];

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export function TimerPicker({ value, onChange }: Props) {
  return (
    <View className="mb-2 flex-row items-center gap-2 rounded-2xl bg-background py-1.5 pl-3">
      <View className="flex-row items-center gap-1">
        <Timer size={14} color={colors.primary} />
        <Text className="text-xs font-semibold text-muted">Otomatik sil</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 6, paddingRight: 8 }}
      >
        {TIMER_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Otomatik silme: ${opt.label}`}
              className={`min-h-8 justify-center rounded-full px-3 ${active ? "bg-primary" : "border border-border bg-surface"}`}
            >
              <Text className={`text-xs font-semibold ${active ? "text-white" : "text-text"}`}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
