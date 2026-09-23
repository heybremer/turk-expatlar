import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "bg-surface border border-border",
  ghost: "bg-transparent",
  danger: "bg-danger",
};

const TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-text",
  ghost: "text-primary",
  danger: "text-white",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "min-h-11 px-3 py-2",
  md: "min-h-12 px-4 py-2.5",
  lg: "min-h-14 px-6 py-3.5",
};

const TEXT_SIZE: Record<Size, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

type Props = TouchableOpacityProps & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
};

export function Button({ variant = "primary", size = "md", loading, label, disabled, ...rest }: Props) {
  return (
    <TouchableOpacity
      {...rest}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: Boolean(loading) }}
      className={`flex-row items-center justify-center rounded-xl ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${disabled || loading ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#0f766e" : "#fff"} size="small" />
      ) : (
        <Text className={`font-semibold ${TEXT_CLASSES[variant]} ${TEXT_SIZE[size]}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
