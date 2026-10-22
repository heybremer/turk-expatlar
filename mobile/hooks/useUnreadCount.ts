import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

/** Okunmamış bildirim sayısı. API düz sayı döndürür (eski sürümler `{ unreadCount }`). */
export function useUnreadCount() {
  const { token } = useAuth();
  const { data } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: async () => {
      const res = await api.get<number | { unreadCount: number }>("/notifications/unread-count", token);
      return typeof res === "number" ? res : (res?.unreadCount ?? 0);
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  return data ?? 0;
}
