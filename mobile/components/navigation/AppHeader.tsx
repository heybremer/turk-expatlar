import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Bell, Menu } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigationMenu } from "./NavigationMenu";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { colors } from "@/lib/colors";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showMenu?: boolean;
  showBell?: boolean;
  compact?: boolean;
  /** Başlığın altında (arama, sekme vb.) gösterilecek ek içerik. */
  children?: ReactNode;
};

/** Yuvarlak, açık zeminli başlık ikonu butonu (AppHeader/DetailHeader aksiyonları için). */
export function HeaderIconButton({
  icon: Icon,
  onPress,
  label,
  badge,
}: {
  icon: typeof Bell;
  onPress: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className="h-10 w-10 items-center justify-center rounded-full bg-background active:opacity-70"
    >
      <Icon size={20} color={colors.text} strokeWidth={2.1} />
      {badge && badge > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1">
          <Text className="text-[9px] font-bold text-white">{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function NotificationBell() {
  const router = useRouter();
  const unreadCount = useUnreadCount();
  return (
    <HeaderIconButton
      icon={Bell}
      label="Bildirimler"
      badge={unreadCount}
      onPress={() => router.push("/(tabs)/profil/bildirimler")}
    />
  );
}

/** Sekme kök ekranlarının büyük başlığı (menü + başlık + bildirim zili). */
export function AppHeader({
  title,
  subtitle,
  action,
  showMenu = true,
  showBell = true,
  compact = false,
  children,
}: AppHeaderProps) {
  const { openMenu } = useNavigationMenu();
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`border-b border-border bg-surface px-4 ${compact ? "pb-3" : "pb-4"}`}
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="min-h-11 flex-row items-center gap-3">
        {showMenu ? <HeaderIconButton icon={Menu} label="Menüyü aç" onPress={openMenu} /> : null}
        <View className="flex-1">
          <Text className="text-[22px] font-extrabold tracking-tight text-text" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          {action}
          {showBell ? <NotificationBell /> : null}
        </View>
      </View>
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}
