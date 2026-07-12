/**
 * Tek kaynak renk token'ları — tailwind.config.js ile birebir aynı olmalı.
 * StyleSheet, Ionicons `color` prop'u ve RefreshControl tint'i gibi
 * className kullanamayan yerlerde bu sabitler kullanılır.
 */
export const colors = {
  primary: "#1a56db",
  primaryDark: "#1444b8",
  surface: "#ffffff",
  background: "#f3f4f6",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  mutedLight: "#9ca3af",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  white: "#ffffff",
} as const;
