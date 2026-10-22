import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/colors";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "bg-surface border border-border",
  soft: "bg-primary/10",
  ghost: "bg-transparent",
  danger: "bg-danger",
};

const TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-text",
  soft: "text-primary",
  ghost: "text-primary",
  danger: "text-white",
};

const ICON_COLORS: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.text,
  soft: colors.primary,
  ghost: colors.primary,
  danger: colors.white,
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "min-h-10 px-3.5 gap-1.5 rounded-xl",
  md: "min-h-12 px-5 gap-2 rounded-2xl",
  lg: "min-h-14 px-6 gap-2 rounded-2xl",
};

const TEXT_SIZE: Record<Size, string> = {
  sm: "text-sm",
  md: "text-[15px]",
  lg: "text-base",
};

type Props = TouchableOpacityProps & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
  icon?: LucideIcon;
  className?: string;
};

/** Uygulamanın tek buton bileşeni. Tüm birincil/ikincil eylemler bunu kullanır. */
export function Button({
  variant = "primary",
  size = "md",
  loading,
  label,
  icon: Icon,
  disabled,
  className = "",
  ...rest
}: Props) {
  const iconColor = ICON_COLORS[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      {...rest}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: Boolean(loading) }}
      className={`flex-row items-center justify-center ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${
        disabled || loading ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          {Icon ? (
            <View>
              <Icon size={size === "sm" ? 16 : 18} color={iconColor} strokeWidth={2.2} />
            </View>
          ) : null}
          <Text className={`font-bold ${TEXT_CLASSES[variant]} ${TEXT_SIZE[size]}`}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
