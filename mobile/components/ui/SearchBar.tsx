import { Pressable, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
};

/** Uygulama genelinde kullanılan standart arama alanı. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Ara…",
  className = "",
  autoFocus = false,
  onSubmit,
}: Props) {
  return (
    <View className={`min-h-11 flex-row items-center gap-2 rounded-2xl bg-background px-3.5 ${className}`}>
      <Search size={17} color={colors.mutedLight} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        className="flex-1 py-2.5 text-[15px] text-text"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={10}
          accessibilityLabel="Aramayı temizle"
          className="h-5 w-5 items-center justify-center rounded-full bg-muted-light"
        >
          <X size={12} color={colors.white} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}
