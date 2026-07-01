import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    <View className="flex-row flex-wrap items-center gap-1.5 bg-background rounded-xl px-3 py-2 mb-2">
      <Ionicons name="time-outline" size={14} color="#6b7280" />
      <Text className="text-xs text-muted mr-1">Otomatik sil:</Text>
      {TIMER_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={`rounded-full px-2.5 py-1 ${value === opt.value ? "bg-primary" : "border border-border bg-surface"}`}
        >
          <Text className={`text-xs font-medium ${value === opt.value ? "text-white" : "text-text"}`}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
