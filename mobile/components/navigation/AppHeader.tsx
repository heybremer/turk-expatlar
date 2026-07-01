import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigationMenu } from "./NavigationMenu";
import { useUnreadCount } from "@/hooks/useUnreadCount";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showMenu?: boolean;
  showBell?: boolean;
  compact?: boolean;
};

function NotificationBell() {
  const router = useRouter();
  const unreadCount = useUnreadCount();

  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/profil/bildirimler")}
      accessibilityRole="button"
      accessibilityLabel="Bildirimler"
      className="h-11 w-11 items-center justify-center rounded-2xl bg-background"
    >
      <Ionicons name="notifications-outline" size={20} color="#111827" />
      {unreadCount > 0 && (
        <View className="absolute right-1.5 top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1">
          <Text className="text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function AppHeader({
  title,
  subtitle,
  action,
  showMenu = true,
  showBell = true,
  compact = false,
}: AppHeaderProps) {
  const { openMenu } = useNavigationMenu();
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`border-b border-border bg-surface px-4 ${compact ? "pb-3" : "pb-4"}`}
      style={{ paddingTop: insets.top + (compact ? 6 : 10) }}
    >
      <View className="flex-row items-center gap-3">
        {showMenu && (
          <TouchableOpacity
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel="Menüyü aç"
            className="h-11 w-11 items-center justify-center rounded-2xl bg-background"
          >
            <Ionicons name="menu-outline" size={24} color="#111827" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-text" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          {showBell && !action && <NotificationBell />}
          {action}
        </View>
      </View>
    </View>
  );
}
