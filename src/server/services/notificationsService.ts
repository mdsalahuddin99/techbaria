/**
 * Notifications service — Prisma-backed, framework-agnostic.
 *
 * Scoped by `ctx.shopId` (multi-tenant).
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import type { AppNotification, NotificationType } from "@/features/notifications/types";

export interface NotificationCreateInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export const notificationsService = {
  /** List all notifications for the shop (paginated). */
  async list(ctx: Ctx, params?: PaginationParams) {
    const raw = await paginate<any>(
      prisma.notification,
      {},
      params,
      { orderBy: { createdAt: "desc" as const } },
    );

    return {
      ...raw,
      items: raw.items.map((n: any) => ({
        id: n.id,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        date: n.createdAt.toISOString(),
        read: n.read,
        link: n.link || undefined,
      })),
    };
  },

  /** Get unread count. */
  async unreadCount(ctx: Ctx) {
    return prisma.notification.count({
      where: { read: false },
    });
  },

  /** Push / Create a new notification. */
  async push(ctx: Ctx, input: NotificationCreateInput) {
    const n = await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
        read: false,
      },
    });

    return {
      id: n.id,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      date: n.createdAt.toISOString(),
      read: n.read,
      link: n.link || undefined,
    } as AppNotification;
  },

  /** Mark a notification as read. */
  async markRead(ctx: Ctx, id: string) {
    const updated = await prisma.notification.updateMany({
      where: { id },
      data: { read: true },
    });

    if (updated.count === 0) {
      throw new ServiceError("NOT_FOUND", "Notification not found", 404);
    }
  },

  /** Mark all notifications for the shop as read. */
  async markAllRead(ctx: Ctx) {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  },

  /** Clear all notifications for the shop. */
  async clear(ctx: Ctx) {
    await prisma.notification.deleteMany({});
  },

  /** Adapter compatibility methods. */
  async create(ctx: Ctx, input: NotificationCreateInput) {
    return this.push(ctx, input);
  },

  async update(ctx: Ctx, id: string, patch: { read?: boolean }) {
    const updated = await prisma.notification.updateMany({
      where: { id },
      data: patch,
    });

    if (updated.count === 0) {
      throw new ServiceError("NOT_FOUND", "Notification not found", 404);
    }

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) throw new ServiceError("NOT_FOUND", "Notification not found", 404);

    return {
      id: n.id,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      date: n.createdAt.toISOString(),
      read: n.read,
      link: n.link || undefined,
    } as AppNotification;
  },

  async remove(ctx: Ctx, id: string) {
    const res = await prisma.notification.deleteMany({
      where: { id },
    });

    if (res.count === 0) {
      throw new ServiceError("NOT_FOUND", "Notification not found", 404);
    }
  },
};
