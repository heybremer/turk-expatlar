import { ReactNode, useRef } from "react";
import { View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { Reply } from "lucide-react-native";
import { colors } from "@/lib/colors";

function ReplyHint({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.6, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.5, 1], "clamp") }],
  }));
  return (
    <Animated.View style={[{ width: 52, alignItems: "center", justifyContent: "center" }, style]}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Reply size={16} color={colors.primary} />
      </View>
    </Animated.View>
  );
}

/** WhatsApp gibi: mesajı sağa kaydırınca yanıtlama başlar. */
export function SwipeToReply({
  children,
  onReply,
  enabled = true,
}: {
  children: ReactNode;
  onReply: () => void;
  enabled?: boolean;
}) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      enabled={enabled}
      friction={2}
      leftThreshold={48}
      overshootLeft={false}
      dragOffsetFromLeftEdge={12}
      renderLeftActions={(progress) => <ReplyHint progress={progress} />}
      onSwipeableWillOpen={() => {
        onReply();
        requestAnimationFrame(() => ref.current?.close());
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
