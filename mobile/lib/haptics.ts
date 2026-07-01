import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function safe(fn: () => Promise<unknown>) {
  if (Platform.OS === "web") return;
  fn().catch(() => {});
}

export const haptics = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  send: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  longPress: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  receive: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
