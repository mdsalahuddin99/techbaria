/**
 * Cash-shift service — Prisma-backed, framework-agnostic.
 *
 * Scoped directly for a single tenant.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import type { CashShift, ShiftStatus } from "@/features/accounts/types";

export const shiftsService = {
  /** List all shifts for the shop. */
  async list(ctx: Ctx) {
    const shifts = await prisma.cashShift.findMany({
      orderBy: { openedAt: "desc" },
    });

    return shifts.map((s) => ({
      id: s.id,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString(),
      openingBalance: Number(s.openingBalance),
      closingCount: s.closingCount ? Number(s.closingCount) : undefined,
      expectedCash: s.expectedCash ? Number(s.expectedCash) : undefined,
      overShort: s.overShort ? Number(s.overShort) : undefined,
      salesByMethod: s.salesByMethod ? (s.salesByMethod as any) : undefined,
      cashier: s.cashierName,
      status: s.status as ShiftStatus,
    })) as CashShift[];
  },

  /** Get a shift by ID. */
  async getById(ctx: Ctx, id: string) {
    const s = await prisma.cashShift.findUnique({
      where: { id },
    });

    if (!s) throw new ServiceError("NOT_FOUND", "Shift not found", 404);

    return {
      id: s.id,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString(),
      openingBalance: Number(s.openingBalance),
      closingCount: s.closingCount ? Number(s.closingCount) : undefined,
      expectedCash: s.expectedCash ? Number(s.expectedCash) : undefined,
      overShort: s.overShort ? Number(s.overShort) : undefined,
      salesByMethod: s.salesByMethod ? (s.salesByMethod as any) : undefined,
      cashier: s.cashierName,
      status: s.status as ShiftStatus,
    } as CashShift;
  },

  /** Get active (Open) shift. */
  async active(ctx: Ctx) {
    const s = await prisma.cashShift.findFirst({
      where: { status: "Open" },
    });

    if (!s) return null;

    return {
      id: s.id,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString(),
      openingBalance: Number(s.openingBalance),
      closingCount: s.closingCount ? Number(s.closingCount) : undefined,
      expectedCash: s.expectedCash ? Number(s.expectedCash) : undefined,
      overShort: s.overShort ? Number(s.overShort) : undefined,
      salesByMethod: s.salesByMethod ? (s.salesByMethod as any) : undefined,
      cashier: s.cashierName,
      status: s.status as ShiftStatus,
    } as CashShift;
  },

  /** Open a new cashier shift. */
  async open(ctx: Ctx, openingBalance: number) {
    if (openingBalance < 0) {
      throw new ServiceError("VALIDATION", "Opening balance must be ≥ 0", 400);
    }

    return prisma.$transaction(async (tx) => {
      const activeShift = await tx.cashShift.findFirst({
        where: { status: "Open" },
      });

      if (activeShift) {
        throw new ServiceError("SHIFT_ALREADY_OPEN", "A shift is already open", 400);
      }

      // Fetch user name for cashierName
      const user = await tx.user.findUnique({
        where: { id: ctx.userId },
        select: { name: true, email: true },
      });
      const cashierName = user?.name || user?.email || "Cashier";

      const shift = await tx.cashShift.create({
        data: {
          openingBalance,
          cashierId: ctx.userId,
          cashierName,
          status: "Open",
        },
      });

      return {
        id: shift.id,
        openedAt: shift.openedAt.toISOString(),
        openingBalance: Number(shift.openingBalance),
        cashier: shift.cashierName,
        status: shift.status as ShiftStatus,
      } as CashShift;
    });
  },

  /** Close the active shift. */
  async close(ctx: Ctx, closingCount: number) {
    if (closingCount < 0) {
      throw new ServiceError("VALIDATION", "Closing count must be ≥ 0", 400);
    }

    return prisma.$transaction(async (tx) => {
      const activeShift = await tx.cashShift.findFirst({
        where: { status: "Open" },
      });

      if (!activeShift) {
        throw new ServiceError("NO_OPEN_SHIFT", "No open shift found", 400);
      }

      // Calculate expected cash and sales totals since shift opened
      const sales = await tx.sale.findMany({
        where: {
          createdAt: { gte: activeShift.openedAt },
        },
        include: { tenders: true },
      });

      let cashIn = 0;
      let cashOut = 0; // if refunds are processed
      const salesTotals = {
        Cash: 0,
        Card: 0,
        "Mobile Banking": 0,
      };

      for (const sale of sales) {
        if (sale.status === "COMPLETED") {
          for (const t of sale.tenders) {
            const amount = Number(t.amount);
            if (t.type === "CASH") {
              // Deduct change if any from cash tender
              const change = Math.max(0, Number(sale.paid) - Number(sale.total));
              cashIn += Math.max(0, amount - change);
              salesTotals.Cash += Math.max(0, amount - change);
            } else if (t.type === "CARD") {
              salesTotals.Card += amount;
            } else if (["BKASH", "NAGAD", "ROCKET"].includes(t.type)) {
              salesTotals["Mobile Banking"] += amount;
            }
          }
        } else if (sale.status === "REFUNDED") {
          for (const t of sale.tenders) {
            const amount = Number(t.amount);
            if (t.type === "CASH") {
              cashOut += amount;
            }
          }
        }
      }

      const expectedCashVal = Number(activeShift.openingBalance) + cashIn - cashOut;
      const overShortVal = closingCount - expectedCashVal;

      await tx.cashShift.update({
        where: { id: activeShift.id },
        data: {
          closedAt: new Date(),
          closingCount,
          expectedCash: expectedCashVal,
          overShort: overShortVal,
          salesByMethod: salesTotals,
          status: "Closed",
        },
      });
    });
  },

  /** Calculate expected cash in drawer for the currently open shift. */
  async expectedCash(ctx: Ctx) {
    const activeShift = await prisma.cashShift.findFirst({
      where: { status: "Open" },
    });

    if (!activeShift) return 0;

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: activeShift.openedAt },
      },
      include: { tenders: true },
    });

    let cashIn = 0;
    let cashOut = 0;

    for (const sale of sales) {
      if (sale.status === "COMPLETED") {
        for (const t of sale.tenders) {
          const amount = Number(t.amount);
          if (t.type === "CASH") {
            const change = Math.max(0, Number(sale.paid) - Number(sale.total));
            cashIn += Math.max(0, amount - change);
          }
        }
      } else if (sale.status === "REFUNDED") {
        for (const t of sale.tenders) {
          const amount = Number(t.amount);
          if (t.type === "CASH") {
            cashOut += amount;
          }
        }
      }
    }

    return Number(activeShift.openingBalance) + cashIn - cashOut;
  },
};
