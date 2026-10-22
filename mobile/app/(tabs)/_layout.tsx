import { Tabs } from "expo-router";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, House, MessageCircle, MessagesSquare, UserRound, type LucideIcon } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors } from "@/lib/colors";

const PRIMARY = colors.primary;
const MUTED = colors.muted;
const ACTIVE_BG = "rgba(15, 118, 110, 0.10)";
const TAB_BAR_CONTENT_HEIGHT = 56;

function TabIcon({ icon: Icon, label, focused }: { icon: LucideIcon; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Icon size={22} color={focused ? PRIMARY : MUTED} strokeWidth={focused ? 2.4 : 1.9} />
      <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Sohbet sekmesinde okunmamış özel mesaj sayısını gösterir (bildirimler zil ikonunda). */
function SohbetTabBadge() {
  const { token } = useAuth();
  const { data: dm } = useQuery({
    queryKey: ["chat-dm-unread"],
    queryFn: () => api.get<{ count: number }>("/chat/dm/unread-count", token),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const count = dm?.count ?? 0;
  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : String(count)}</Text>
    </View>
  );
}

/**
 * Sekme klasörlerinin (forum, sohbet, etkinlikler, profil) içinde "index" dışındaki
 * bir ekrana (detay, yeni, ayar vb.) geçildiğinde alt tab bar'ı gizler. Böylece tüm
 * detay/form ekranları, uygulamadaki diğer push ekranlarıyla (rehber/isler detayları
 * gibi) tutarlı şekilde tam ekran ve sabit bir geri butonuna sahip olur.
 */
function tabBarStyleFor(route: Parameters<typeof getFocusedRouteNameFromRoute>[0], baseStyle: object) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route);
  if (focusedRouteName && focusedRouteName !== "index") {
    return { display: "none" as const };
  }
  return baseStyle;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const tabBarBaseStyle = {
    ...styles.tabBar,
    height: tabBarHeight,
    paddingBottom: Math.max(insets.bottom, 8),
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabBarBaseStyle,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="akis"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={House} label="Akış" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={MessagesSquare} label="Forum" focused={focused} />
          ),
          tabBarStyle: tabBarStyleFor(route, tabBarBaseStyle),
        })}
      />
      <Tabs.Screen
        name="sohbet"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <View style={{ position: "relative" }}>
              <TabIcon icon={MessageCircle} label="Sohbet" focused={focused} />
              <SohbetTabBadge />
            </View>
          ),
          tabBarStyle: tabBarStyleFor(route, tabBarBaseStyle),
        })}
      />
      <Tabs.Screen
        name="etkinlikler"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={CalendarDays} label="Etkinlik" focused={focused} />
          ),
          tabBarStyle: tabBarStyleFor(route, tabBarBaseStyle),
        })}
      />
      <Tabs.Screen
        name="profil"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={UserRound} label="Profil" focused={focused} />
          ),
          tabBarStyle: tabBarStyleFor(route, tabBarBaseStyle),
        })}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 56,
  },
  tabItemActive: {
    backgroundColor: ACTIVE_BG,
  },
  label: {
    fontSize: 11,
    marginTop: 3,
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: "700",
  },
  labelInactive: {
    color: MUTED,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: -4,
    minWidth: 16,
    height: 16,
    backgroundColor: colors.danger,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
});
