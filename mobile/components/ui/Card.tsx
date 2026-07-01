import { View, ViewProps } from "react-native";

type Props = ViewProps & {
  className?: string;
};

export function Card({ children, className = "", ...rest }: Props) {
  return (
    <View
      {...rest}
      className={`rounded-2xl bg-surface border border-border p-4 ${className}`}
    >
      {children}
    </View>
  );
}
