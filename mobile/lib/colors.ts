/**
 * Tek kaynak renk token'ları — tailwind.config.js ile birebir aynı olmalı.
 * StyleSheet, Ionicons `color` prop'u ve RefreshControl tint'i gibi
 * className kullanamayan yerlerde bu sabitler kullanılır.
 */
export const colors = {
  primary: "#0f766e",
  primaryDark: "#115e59",
  accent: "#e11d48",
  surface: "#ffffff",
  background: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  mutedLight: "#94a3b8",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  white: "#ffffff",
} as const;
