/**
 * Typed fetch wrapper for the notifications API.
 */
import { apiFetch } from "./fetch";
import type { AppNotification } from "@/features/notifications/types";

const BASE = "/api/notifications";

export const notificationsApi = {
  list(): Promise<AppNotification[]> {
    return apiFetch<AppNotification[]>(BASE);
  },

  unreadCount(): Promise<{ count: number }> {
    return apiFetch<{ count: number }>(`${BASE}?count=true`);
  },

  push(title: string, message: string, type?: string): Promise<void> {
    return apiFetch<void>(BASE, { method: "POST", body: JSON.stringify({ title, message, type }) });
  },

  markRead(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify({ read: true }) });
  },

  markAllRead(): Promise<void> {
    return apiFetch<void>(`${BASE}/read-all`, { method: "POST" });
  },

  update(id: string, data: Partial<AppNotification>): Promise<AppNotification> {
    return apiFetch<AppNotification>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
  },

  clear(): Promise<void> {
    return apiFetch<void>(BASE, { method: "DELETE" });
  },
};
