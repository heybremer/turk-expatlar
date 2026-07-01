import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export function useUnreadCount() {
  const { token } = useAuth();
  const { data } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: () => api.get<{ unreadCount: number }>("/notifications/unread-count", token),
    enabled: !!token,
    refetchInterval: 30000,
  });

  return data?.unreadCount ?? 0;
}
