export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import { customersService } from "@/server/services/customersService";
import { accountsService } from "@/server/services/accountsService";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/pos/init[?branchId=<id>]
 *
 * Returns all invoice-page data in a single response.
 * When `branchId` is supplied, products are filtered to those with
 * an active BranchStock entry (qty > 0) for that branch — not the
 * global aggregate stock — enforcing the warehouse-scoped stock rule.
 *
 * Without `branchId`, falls back to the global stock filter
 * (stock > 0 && purchaseItems.some) for backward compatibility.
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId") ?? null;

  const [rawProducts, customers, accounts, branches, warehouses, shop, categories, users] = await Promise.all([
    warehouseId
      ? // ── Warehouse-scoped: only products present in this warehouse's WarehouseStock ──
        prisma.product.findMany({
          where: {
            shopId: ctx.shopId,
            warehouseStocks: {
              some: {
                warehouseId,
                qty: { gt: 0 },
              },
            },
          },
          select: {
            id: true,
            name: true,
            barcode: true,
            sku: true,
            price: true,
            cost: true,
            isPublished: true,
            wholesalePrice: true,
            reorderLevel: true,
            emoji: true,
            color: true,
            storage: true,
            ram: true,
            condition: true,
            trackSerials: true,
            supplierId: true,
            warrantyStartDate: true,
            warrantyMonths: true,
            category: { select: { name: true } },
            images: { select: { url: true }, take: 1, orderBy: { position: "asc" as const } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
            series: { select: { name: true } },
            subcategory: true,
            warehouseStocks: {
              where: { warehouseId },
              select: { qty: true },
            },
            serialNumbers: {
              where: { status: "IN_STOCK" },
              select: { 
                serial: true, 
                warrantyExpiryDate: true, 
                createdAt: true,
                purchaseItem: { select: { warrantyStartDate: true, warrantyMonths: true } }
              },
            },
            stock: true,
          },
          orderBy: { name: "asc" },
          take: 500,
        })
      : // ── Fallback: global stock (no branch selected) ──
        prisma.product.findMany({
          where: {
            shopId: ctx.shopId,
            stock: { gt: 0 },
            purchaseItems: { some: {} },
          },
          select: {
            id: true,
            name: true,
            barcode: true,
            sku: true,
            price: true,
            cost: true,
            isPublished: true,
            wholesalePrice: true,
            reorderLevel: true,
            emoji: true,
            color: true,
            storage: true,
            ram: true,
            condition: true,
            trackSerials: true,
            supplierId: true,
            warrantyStartDate: true,
            warrantyMonths: true,
            category: { select: { name: true } },
            images: { select: { url: true }, take: 1, orderBy: { position: "asc" as const } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
            series: { select: { name: true } },
            subcategory: true,
            warehouseStocks: { select: { qty: true } },
            serialNumbers: {
              where: { status: "IN_STOCK" },
              select: { 
                serial: true, 
                warrantyExpiryDate: true, 
                createdAt: true,
                purchaseItem: { select: { warrantyStartDate: true, warrantyMonths: true } }
              },
            },
            stock: true,
          },
          orderBy: { name: "asc" },
          take: 500,
        }),
    prisma.customer.findMany({
      where: { shopId: ctx.shopId },
      select: { id: true, name: true, phone: true, balance: true, due: true, group: true },
      orderBy: { createdAt: "desc" },
    }),
    accountsService.list(ctx),
    prisma.branch.findMany({
      where: { shopId: ctx.shopId, isActive: true },
      orderBy: [{ isHeadOffice: "desc" }, { name: "asc" }],
    }),
    prisma.warehouse.findMany({
      where: { shopId: ctx.shopId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.shop.findUnique({
      where: { id: ctx.shopId },
      select: { name: true },
    }),
    prisma.category.findMany({
      where: { shopId: ctx.shopId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { shopId: ctx.shopId, active: true, role: { not: "VIEWER" } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialise products — use WarehouseStock qty if warehouseId provided, else aggregate stock
  const products = rawProducts.map((p: any) => {
    const warehouseQty = warehouseId
      ? (p.warehouseStocks?.[0]?.qty ?? 0)
      : p.stock;

    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      sku: p.sku,
      stock: warehouseQty,
      price: Number(p.price),
      cost: Number(p.cost ?? 0),
      category: p.category?.name ?? "",
      active: p.isPublished,
      costPrice: Number(p.cost),
      wholesalePrice: Number(p.wholesalePrice ?? 0),
      minStock: p.reorderLevel,
      imageUrl: (p.images as Array<{ url: string }> | undefined)?.[0]?.url ?? "",
      emoji: p.emoji ?? "📦",
      brand: p.brand?.name ?? p.brand ?? "",
      model: p.model?.name ?? p.model ?? "",
      subcategory: p.subcategory ?? "",
      series: p.series?.name ?? p.series ?? "",
      color: p.color ?? "",
      storage: p.storage ?? "",
      ram: p.ram ?? "",
      condition: p.condition ?? undefined,
      trackSerials: p.trackSerials ?? true,
      supplierId: p.supplierId ?? null,
      warrantyStartDate: p.warrantyStartDate ?? undefined,
      warrantyMonths: p.warrantyMonths ?? undefined,
      type: "simple" as const,
      serials: (p.serialNumbers || []).map((s: any) => ({
        serialNumber: s.serial,
        status: "in_stock" as const,
        warrantyExpiryDate: s.warrantyExpiryDate?.toISOString() || undefined,
        createdAt: s.createdAt?.toISOString() || undefined,
        warrantyMonths: s.purchaseItem?.warrantyMonths ?? undefined,
        warrantyStartDate: s.purchaseItem?.warrantyStartDate?.toISOString() || undefined,
      })),
    };
  });

  return {
    products: { items: products, nextCursor: null, hasMore: false },
    customers,
    accounts,
    branches,
    warehouses,
    categories,
    users,
    settings: {
      shopName: shop?.name ?? "",
      currencySymbol: "৳",
    },
  };
}, "pos:init");
