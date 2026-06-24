import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services";
import type { AppNotification } from "@/shared/lib/types";
import { useAuth } from "@/features/auth";

export function useNotifications() {
  const { session, status } = useAuth();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.list(),
    enabled: status !== "loading" && !!session,
    staleTime: 2 * 60_000,   // 2 min — নতুন notification আসলে invalidate হয়
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,  // polling বন্ধ — event-driven invalidation যথেষ্ট
  });
  return ((data as any)?.items ?? []) as any[];
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  return {
    push: (n: Omit<AppNotification, "id" | "date" | "read">) =>
      notificationsService.push(n.title, n.message, n.type).then(() => invalidate()),
    markRead: (id: string) => notificationsService.markRead(id).then(() => invalidate()),
    markAllRead: () => notificationsService.markAllRead().then(() => invalidate()),
    clear: () => notificationsService.clear().then(() => invalidate()),
  };
}

export function useUnreadCount() {
  const notifications = useNotifications();
  return notifications.filter((n) => !n.read).length;
}
