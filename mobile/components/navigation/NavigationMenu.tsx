import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Constants from "expo-constants";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  House,
  Info,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Plane,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { Href, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { colors } from "@/lib/colors";
import { Avatar } from "@/components/ui/Avatar";
import { IconTile } from "@/components/ui/kit";

type NavigationMenuContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
};

type MenuItem = {
  icon: LucideIcon;
  tint?: string;
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      className={`min-h-14 flex-row items-center gap-3 rounded-2xl px-2.5 py-2 active:opacity-70 ${
        active ? "bg-primary/10" : "bg-transparent"
      }`}
    >
      <IconTile icon={item.icon} tint={active ? colors.primary : item.tint ?? colors.primary} size={38} />
      <View className="flex-1">
        <Text className={`text-[15px] font-semibold ${active ? "text-primary" : "text-text"}`}>{item.label}</Text>
        {item.description ? (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
      {!!item.badge && item.badge > 0 ? (
        <View className="h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5">
          <Text className="text-[11px] font-bold text-white">{item.badge > 99 ? "99+" : item.badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={16} color={active ? colors.primary : colors.mutedLight} />
    </Pressable>
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
  const { data: dmUnread } = useQuery({
    queryKey: ["chat-dm-unread"],
    queryFn: () => api.get<{ count: number }>("/chat/dm/unread-count", token),
    enabled: !!token,
    refetchInterval: 30000,
  });
  const dmUnreadCount = dmUnread?.count ?? 0;

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
      { icon: House, label: "Akış", description: "Toplulukta öne çıkanlar", href: "/(tabs)/akis" },
      { icon: MessagesSquare, label: "Forum", description: "Sorular, cevaplar ve rehberler", href: "/(tabs)/forum" },
      {
        icon: MessageCircle,
        label: "Sohbet",
        description: "Odalar ve özel mesajlar",
        href: "/(tabs)/sohbet",
        badge: dmUnreadCount,
      },
      { icon: CalendarDays, tint: colors.accent, label: "Etkinlikler", description: "Buluşmalar ve duyurular", href: "/(tabs)/etkinlikler" },
    ],
    [dmUnreadCount],
  );

  const secondaryItems: MenuItem[] = useMemo(
    () => [
      { icon: Search, tint: colors.muted, label: "Arama", description: "Tüm içeriklerde arayın", href: "/ara" },
      { icon: Store, tint: colors.warning, label: "Rehber", description: "Türkçe hizmet veren işletmeler", href: "/rehber" },
      { icon: Briefcase, label: "İş İlanları", description: "İş ve kariyer fırsatları", href: "/isler" },
      { icon: Plane, tint: colors.accent, label: "Seyahat", description: "Taşıma talepleri ve yolculuk ilanları", href: "/seyahat" as Href },
      { icon: LayoutGrid, tint: colors.success, label: "Mini Uygulamalar", description: "Haberler ve pratik araçlar", href: "/uygulamalar" },
      { icon: ShieldCheck, tint: colors.success, label: "Sohbet Kuralları", description: "Güvenli iletişim ilkeleri", href: "/(tabs)/sohbet/kurallar" as Href },
    ],
    [],
  );

  const accountItems: MenuItem[] = useMemo(
    () => [
      { icon: UserRound, label: "Profilim", description: "Hesap, bildirim ve ayarlar", href: "/(tabs)/profil" },
      { icon: Bell, tint: colors.warning, label: "Bildirimler", description: "Tüm aktiviteleriniz", href: "/(tabs)/profil/bildirimler", badge: unreadCount },
      { icon: LifeBuoy, tint: colors.accent, label: "Destek", description: "Sorun, öneri ve istek gönderin", href: "/destek" },
      { icon: Info, tint: colors.muted, label: "Hakkında ve Yasal", description: "Gizlilik ve kullanım koşulları", href: "/bilgi/hakkinda" as Href },
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

  const activeHref = useMemo(() => {
    const current = normalizePath(pathname);
    let best: string | null = null;
    for (const item of [...primaryItems, ...secondaryItems, ...accountItems]) {
      const target = normalizePath(String(item.href));
      const matches = current === target || current.startsWith(`${target}/`);
      if (matches && (!best || target.length > best.length)) best = target;
    }
    return best;
  }, [pathname, primaryItems, secondaryItems, accountItems]);

  function isActive(href: Href) {
    return normalizePath(String(href)) === activeHref;
  }

  function confirmLogout() {
    Alert.alert("Çıkış yap", "Hesabınızdan çıkış yapılsın mı?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: () => {
          closeMenu();
          void logout();
        },
      },
    ]);
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
                paddingHorizontal: 14,
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

              {[
                { title: "Ana Menü", items: primaryItems },
                { title: "Keşfet", items: secondaryItems },
                { title: "Hesap", items: accountItems },
              ].map((section, index) => (
                <View key={section.title} className={index > 0 ? "mt-5" : ""}>
                  <Text className="mb-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-muted">
                    {section.title}
                  </Text>
                  <View className="gap-0.5">
                    {section.items.map((item) => (
                      <MenuRow
                        key={item.label}
                        item={item}
                        active={isActive(item.href)}
                        onPress={() => navigate(item.href)}
                      />
                    ))}
                  </View>
                </View>
              ))}

              <Pressable
                onPress={confirmLogout}
                accessibilityRole="button"
                accessibilityLabel="Çıkış yap"
                className="mt-5 min-h-14 flex-row items-center gap-3 rounded-2xl bg-danger/10 px-2.5 py-2 active:opacity-70"
              >
                <IconTile icon={LogOut} tint={colors.danger} size={38} />
                <Text className="flex-1 text-[15px] font-bold text-danger">Çıkış Yap</Text>
              </Pressable>

              <Text className="mt-6 text-center text-xs text-muted-light">Türk Expatlar v{appVersion}</Text>
            </ScrollView>
          </Animated.View>
          <Animated.View style={{ flex: 1, backgroundColor: colors.text, opacity: overlayOpacity }}>
            <Pressable
              style={{ flex: 1 }}
              onPress={closeMenu}
              accessibilityRole="button"
              accessibilityLabel="Menüyü kapat"
            />
          </Animated.View>
        </View>
      </Modal>
    </NavigationMenuContext.Provider>
  );
}
