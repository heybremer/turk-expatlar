import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ChatDmNotificationData = { type: "chat_dm"; chatId?: string; senderId: string };

export function usePushNotifications() {
  const { token } = useAuth();
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (!token || registered.current) return;

    void registerForPushNotifications(token).then(() => {
      registered.current = true;
    });
  }, [token]);

  useEffect(() => {
    function handleTap(data: Record<string, unknown> | undefined) {
      if (!data) return;
      if (data.type === "chat_dm" && typeof (data as ChatDmNotificationData).senderId === "string") {
        router.push(`/(tabs)/sohbet/dm-${(data as ChatDmNotificationData).senderId}` as never);
        return;
      }
      router.push("/(tabs)/profil/bildirimler" as never);
    }

    // Uygulama arka plandayken/kapalıyken bildirime dokunma
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleTap(response.notification.request.content.data as Record<string, unknown> | undefined);
    });

    // Uygulama tamamen kapalıyken bir bildirimle açıldıysa
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleTap(response.notification.request.content.data as Record<string, unknown> | undefined);
    });

    return () => responseSub.remove();
  }, [router]);
}

async function registerForPushNotifications(authToken: string) {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Türk Expatlar",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post("/notifications/expo-token", { token: expoPushToken }, authToken);
  } catch {
    // Push token kaydı kritik değil, sessizce devam et
  }
}
