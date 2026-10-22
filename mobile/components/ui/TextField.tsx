import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";
import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
  /** Şifre alanlarında göster/gizle düğmesi ekler. */
  password?: boolean;
  containerClassName?: string;
};

/** Standart etiketli metin alanı. Tüm formlarda TextInput yerine bu kullanılır. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, hint, error, icon: Icon, password, multiline, containerClassName = "", onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderCls = error ? "border-danger" : focused ? "border-primary" : "border-border";

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label ? <Text className="mb-1.5 text-sm font-semibold text-text">{label}</Text> : null}
      <View
        className={`flex-row rounded-2xl border bg-surface px-3.5 ${borderCls} ${
          multiline ? "min-h-28 items-start py-3" : "min-h-12 items-center"
        }`}
      >
        {Icon ? (
          <View className={multiline ? "mr-2.5 mt-0.5" : "mr-2.5"}>
            <Icon size={18} color={focused ? colors.primary : colors.mutedLight} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedLight}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`flex-1 text-[15px] text-text ${multiline ? "min-h-20" : "py-2.5"}`}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          {...rest}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityLabel={hidden ? "Şifreyi göster" : "Şifreyi gizle"}
            className="ml-2"
          >
            {hidden ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1.5 text-xs font-medium text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
