import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/colors";

type Props = {
  url: string | null;
  onClose: () => void;
};

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 120;

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

export function ImageViewerModal({ url, onClose }: Props) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {url ? <Viewer url={url} onClose={onClose} /> : null}
    </Modal>
  );
}

function Viewer({ url, onClose }: { url: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const dismissY = useSharedValue(0);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
    dismissY.value = 0;
  }, [url, scale, savedScale, tx, ty, savedTx, savedTy, dismissY]);

  function resetZoom() {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
  }

  function clampTranslation(s: number, x: number, y: number) {
    "worklet";
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 0.8, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        resetZoom();
        return;
      }
      savedScale.value = scale.value;
      const c = clampTranslation(scale.value, tx.value, ty.value);
      tx.value = withTiming(c.x);
      ty.value = withTiming(c.y);
      savedTx.value = c.x;
      savedTy.value = c.y;
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      } else {
        dismissY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        const c = clampTranslation(savedScale.value, tx.value, ty.value);
        tx.value = withTiming(c.x);
        ty.value = withTiming(c.y);
        savedTx.value = c.x;
        savedTy.value = c.y;
        return;
      }
      if (Math.abs(e.translationY) > DISMISS_DISTANCE || Math.abs(e.velocityY) > 1000) {
        runOnJS(onClose)();
      } else {
        dismissY.value = withSpring(0, { damping: 18 });
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (savedScale.value > 1) {
        resetZoom();
        return;
      }
      const s = DOUBLE_TAP_SCALE;
      const c = clampTranslation(s, (width / 2 - e.x) * (s - 1), (height / 2 - e.y) * (s - 1));
      scale.value = withTiming(s);
      savedScale.value = s;
      tx.value = withTiming(c.x);
      ty.value = withTiming(c.y);
      savedTx.value = c.x;
      savedTy.value = c.y;
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + dismissY.value },
      { scale: scale.value * interpolate(Math.abs(dismissY.value), [0, 400], [1, 0.85], "clamp") },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dismissY.value), [0, 300], [0.96, 0.3], "clamp"),
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, backdropStyle]} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, imageStyle]}>
          {failed ? (
            <Text className="text-sm text-white/80">Görsel yüklenemedi</Text>
          ) : (
            <Image
              source={{ uri: url }}
              style={{ width, height }}
              resizeMode="contain"
              accessibilityLabel="Görsel, yakınlaştırmak için iki kez dokunun veya kıstırın"
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
            />
          )}
        </Animated.View>
      </GestureDetector>
      {loading && !failed ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
          <ActivityIndicator color={colors.white} />
        </View>
      ) : null}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Görseli kapat"
        hitSlop={8}
        style={{ position: "absolute", top: insets.top + 8, right: 16 }}
        className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
      >
        <X size={22} color={colors.white} />
      </Pressable>
    </GestureHandlerRootView>
  );
}
