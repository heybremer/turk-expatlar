import { Pressable, View, ViewProps } from "react-native";

type Props = ViewProps & {
  className?: string;
  /** Verilirse kart dokunulabilir olur (basınca hafif soluklaşır). */
  onPress?: () => void;
  padded?: boolean;
};

const BASE = "rounded-3xl border border-border bg-surface";

/** Standart içerik kartı: beyaz yüzey, ince çerçeve, 24px köşe. */
export function Card({ children, className = "", onPress, padded = true, ...rest }: Props) {
  const cls = `${BASE} ${padded ? "p-4" : ""} ${className}`;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className={`${cls} active:opacity-70`}
        style={rest.style}
        testID={rest.testID}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View {...rest} className={cls}>
      {children}
    </View>
  );
}
