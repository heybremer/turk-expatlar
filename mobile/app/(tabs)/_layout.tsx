import { Tabs } from "expo-router";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const PRIMARY = "#1a56db";
const MUTED = "#6b7280";
const ACTIVE_BG = "rgba(26, 86, 219, 0.10)";
const TAB_BAR_CONTENT_HEIGHT = 56;

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  icon,
  iconActive,
  label,
  focused,
}: {
  icon: IconName;
  iconActive: IconName;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      {focused && <View style={styles.activeDot} />}
      <Ionicons name={focused ? iconActive : icon} size={22} color={focused ? PRIMARY : MUTED} />
      <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Sohbet sekmesinde özel mesaj + genel bildirim okunmamış sayılarının toplamını gösterir. */
function SohbetTabBadge() {
  const { token } = useAuth();
  const { data: notif } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: () => api.get<{ unreadCount: number }>("/notifications/unread-count", token),
    enabled: !!token,
    refetchInterval: 30000,
  });
  const { data: dm } = useQuery({
    queryKey: ["chat-dm-unread"],
    queryFn: () => api.get<{ count: number }>("/chat/dm/unread-count", token),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const count = (notif?.unreadCount ?? 0) + (dm?.count ?? 0);
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
            <TabIcon icon="home-outline" iconActive="home" label="Akış" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="chatbubbles-outline" iconActive="chatbubbles" label="Forum" focused={focused} />
          ),
          tabBarStyle: tabBarStyleFor(route, tabBarBaseStyle),
        })}
      />
      <Tabs.Screen
        name="sohbet"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <View style={{ position: "relative" }}>
              <TabIcon icon="chatbox-ellipses-outline" iconActive="chatbox-ellipses" label="Sohbet" focused={focused} />
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
            <TabIcon icon="calendar-outline" iconActive="calendar" label="Etkinlik" focused={focused} />
          ),
          tabBarStyle: tabBarStyleFor(route, tabBarBaseStyle),
        })}
      />
      <Tabs.Screen
        name="profil"
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person-outline" iconActive="person" label="Profil" focused={focused} />
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
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    elevation: 12,
    shadowColor: "#111827",
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
  activeDot: {
    position: "absolute",
    top: -9,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY,
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
    backgroundColor: "#dc2626",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
});
