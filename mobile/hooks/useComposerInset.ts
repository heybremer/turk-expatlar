import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Ekranın altına sabit yazma çubukları için alt boşluk: klavye kapalıyken
 * güvenli alan (home indicator) kadar, açıkken klavyeye yapışık ince bir boşluk.
 * Geçiş klavye animasyonuyla birlikte kare kare yapılır.
 */
export function useComposerInset(closedMin = 10, openedPadding = 8) {
  const insets = useSafeAreaInsets();
  const { progress } = useReanimatedKeyboardAnimation();
  const closed = Math.max(insets.bottom, closedMin);
  return useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.value, [0, 1], [closed, openedPadding]),
  }));
}
