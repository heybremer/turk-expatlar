import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { Href, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Avatar } from "@/components/ui/Avatar";

type IconName = keyof typeof Ionicons.glyphMap;

type NavigationMenuContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
};

type MenuItem = {
  icon: IconName;
  label: string;
  description?: string;
  href: Href;
  badge?: number;
};

const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null);

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MODERATOR: "Moderatör",
  USER: "Üye",
};

function useNavigationMenuContext() {
  const value = useContext(NavigationMenuContext);
  if (!value) {
    throw new Error("useNavigationMenu must be used inside NavigationMenuProvider");
  }
  return value;
}

export function useNavigationMenu() {
  return useNavigationMenuContext();
}

function normalizePath(path: string) {
  return path.replace(/^\/\(tabs\)/, "");
}

function MenuRow({
  item,
  active,
  onPress,
}: {
  item: MenuItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`mb-2 flex-row items-center gap-3 rounded-2xl px-3 py-3 ${
        active ? "bg-primary" : "bg-background"
      }`}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-white/20" : "bg-surface"}`}>
        <Ionicons name={item.icon} size={19} color={active ? "#ffffff" : "#1a56db"} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-bold ${active ? "text-white" : "text-text"}`}>{item.label}</Text>
        {item.description && (
          <Text className={`mt-0.5 text-xs ${active ? "text-white/80" : "text-muted"}`} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      {!!item.badge && item.badge > 0 && (
        <View className={`mr-1 min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 ${active ? "bg-white" : "bg-danger"}`}>
          <Text className={`text-xs font-bold ${active ? "text-primary" : "text-white"}`}>
            {item.badge > 99 ? "99+" : item.badge}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={active ? "rgba(255,255,255,0.8)" : "#6b7280"} />
    </TouchableOpacity>
  );
}

export function NavigationMenuProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, token } = useAuth();
  const unreadCount = useUnreadCount();

  const menuWidth = Math.min(width * 0.86, 360);

  const animateTo = useCallback(
    (toValue: 0 | 1, onDone?: () => void) => {
      Animated.timing(progress, {
        toValue,
        duration: toValue === 1 ? 260 : 220,
        easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDone?.();
      });
    },
    [progress],
  );

  const openMenu = useCallback(() => {
    setMounted(true);
    requestAnimationFrame(() => animateTo(1));
  }, [animateTo]);

  const closeMenu = useCallback(() => {
    animateTo(0, () => setMounted(false));
  }, [animateTo]);

  useEffect(() => {
    if (!mounted) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeMenu();
      return true;
    });
    return () => sub.remove();
  }, [mounted, closeMenu]);

  const value = useMemo(() => ({ openMenu, closeMenu }), [openMenu, closeMenu]);

  const primaryItems: MenuItem[] = useMemo(
    () => [
      { icon: "home-outline", label: "Akış", description: "Toplulukta öne çıkanlar", href: "/(tabs)/akis" },
      { icon: "chatbubbles-outline", label: "Forum", description: "Sorular, cevaplar ve rehberler", href: "/(tabs)/forum" },
      {
        icon: "chatbox-ellipses-outline",
        label: "Sohbet",
        description: "Odalar ve özel mesajlar",
        href: "/(tabs)/sohbet",
        badge: unreadCount,
      },
      { icon: "calendar-outline", label: "Etkinlikler", description: "Buluşmalar ve duyurular", href: "/(tabs)/etkinlikler" },
    ],
    [unreadCount],
  );

  const secondaryItems: MenuItem[] = useMemo(
    () => [
      { icon: "storefront-outline", label: "Rehber", description: "Türkçe hizmet veren işletmeler", href: "/rehber" },
      { icon: "briefcase-outline", label: "İş İlanları", description: "İş ve kariyer fırsatları", href: "/isler" },
      { icon: "apps-outline", label: "Mini Uygulamalar", description: "Haberler ve pratik araçlar", href: "/uygulamalar" },
    ],
    [],
  );

  const accountItems: MenuItem[] = useMemo(
    () => [
      { icon: "person-outline", label: "Profilim", description: "Hesap, bildirim ve ayarlar", href: "/(tabs)/profil" },
      { icon: "notifications-outline", label: "Bildirimler", description: "Tüm aktiviteleriniz", href: "/(tabs)/profil/bildirimler", badge: unreadCount },
    ],
    [unreadCount],
  );

  const displayName = user?.profile?.displayName ?? user?.email ?? "Türk Expatlar";
  const roleLabel = user?.role ? ROLE_LABEL[user.role] ?? user.role : null;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  function navigate(href: Href) {
    closeMenu();
    router.push(href);
  }

  function isActive(href: Href) {
    const target = normalizePath(String(href));
    const current = normalizePath(pathname);
    return current === target || current.startsWith(`${target}/`);
  }

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-menuWidth, 0],
  });
  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <NavigationMenuContext.Provider value={value}>
      {children}
      <Modal transparent visible={mounted && !!token} statusBarTranslucent onRequestClose={closeMenu}>
        <View className="flex-1 flex-row">
          <Animated.View
            className="bg-surface"
            style={{ width: menuWidth, transform: [{ translateX }] }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingBottom: insets.bottom + 24,
                paddingTop: insets.top + 14,
              }}
            >
              <View className="mb-5 rounded-3xl bg-primary px-4 py-5">
                <View className="flex-row items-center gap-3">
                  <Avatar name={displayName} url={user?.profile?.avatarUrl} size="md" />
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white" numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-white/80" numberOfLines={1}>
                      {user?.email}
                    </Text>
                  </View>
                </View>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    Almanya Türkçe topluluğu
                  </Text>
                  {roleLabel && (
                    <View className="rounded-full bg-white/20 px-2.5 py-1">
                      <Text className="text-xs font-bold text-white">{roleLabel}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted">Ana Menü</Text>
              {primaryItems.map((item) => (
                <MenuRow key={item.label} item={item} active={isActive(item.href)} onPress={() => navigate(item.href)} />
              ))}

              <Text className="mb-2 mt-4 px-1 text-xs font-bold uppercase tracking-wide text-muted">Keşfet</Text>
              {secondaryItems.map((item) => (
                <MenuRow key={item.label} item={item} active={isActive(item.href)} onPress={() => navigate(item.href)} />
              ))}

              <Text className="mb-2 mt-4 px-1 text-xs font-bold uppercase tracking-wide text-muted">Hesap</Text>
              {accountItems.map((item) => (
                <MenuRow key={item.label} item={item} active={isActive(item.href)} onPress={() => navigate(item.href)} />
              ))}

              <TouchableOpacity
                onPress={() => {
                  closeMenu();
                  void logout();
                }}
                activeOpacity={0.7}
                className="mt-4 flex-row items-center gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-3 py-3"
              >
                <Ionicons name="log-out-outline" size={19} color="#dc2626" />
                <Text className="flex-1 text-sm font-bold text-danger">Çıkış Yap</Text>
              </TouchableOpacity>

              <Text className="mt-6 text-center text-xs text-muted">Türk Expatlar v{appVersion}</Text>
            </ScrollView>
          </Animated.View>
          <Animated.View style={{ flex: 1, backgroundColor: "#000", opacity: overlayOpacity }}>
            <Pressable style={{ flex: 1 }} onPress={closeMenu} />
          </Animated.View>
        </View>
      </Modal>
    </NavigationMenuContext.Provider>
  );
}
