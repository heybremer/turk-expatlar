import { Ionicons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

/** Uygulama genelinde kullanılan standart arama alanı: gri/gölgesiz, hafif yuvarlak köşeli. */
export function SearchBar({ value, onChangeText, placeholder = "Ara…", className = "", autoFocus = false }: Props) {
  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl bg-surface border border-border px-3.5 py-2.5 ${className}`}
    >
      <Ionicons name="search-outline" size={17} color="#9ca3af" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        className="flex-1 text-sm text-text"
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={16} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
}
