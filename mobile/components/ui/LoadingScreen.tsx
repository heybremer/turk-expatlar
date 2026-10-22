import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { colors } from "@/lib/colors";

export function LoadingScreen({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-3 text-sm text-muted">{label}</Text>
    </View>
  );
}

/** İçerik yüklenirken kart iskeleti; listelerde LoadingScreen yerine tercih edilir. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={{ opacity: pulse }} className="gap-3 p-4" accessibilityLabel="Yükleniyor">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="rounded-3xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 rounded-2xl bg-border" />
            <View className="flex-1 gap-2">
              <View className="h-3.5 w-3/4 rounded-full bg-border" />
              <View className="h-3 w-1/2 rounded-full bg-border" />
            </View>
          </View>
          <View className="mt-4 h-3 w-full rounded-full bg-background" />
          <View className="mt-2 h-3 w-2/3 rounded-full bg-background" />
        </View>
      ))}
    </Animated.View>
  );
}
