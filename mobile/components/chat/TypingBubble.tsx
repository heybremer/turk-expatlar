import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { colors } from "@/lib/colors";

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, v]);
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.muted,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
      }}
    />
  );
}

/** Karşı taraf yazarken mesaj listesinin altında görünen üç noktalı balon. */
export function TypingBubble({ label }: { label?: string }) {
  return (
    <View
      className="mb-1 mt-2 flex-row items-end gap-2 pl-10"
      accessible
      accessibilityRole="text"
      accessibilityLabel={label ?? "Yazıyor"}
      accessibilityLiveRegion="polite"
    >
      <View className="h-10 flex-row items-center gap-1 rounded-3xl rounded-bl-md border border-border bg-surface px-3.5">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
      {label ? (
        <Text className="mb-1 flex-shrink text-[11px] text-muted" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
