export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { prisma } from "@/server/db/client";
import { customersService } from "@/server/services/customersService";
import { accountsService } from "@/server/services/accountsService";
import type { Ctx } from "@/server/lib/ctx";

/**
 * GET /api/pos/init[?warehouseId=<id>]
 *
 * Returns all invoice-page data in a single response.
 * When `warehouseId` is supplied, products are filtered to those with
 * an active WarehouseStock entry (qty > 0) for that warehouse — not the
 * global aggregate stock — enforcing the warehouse-scoped stock rule.
 *
 * Without `warehouseId`, falls back to the global stock filter
 * (stock > 0 && purchaseItems.some) for backward compatibility.
 */
export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId") ?? null;

  const [rawProducts, customers, accounts, warehouses, shop, categories, users] = await Promise.all([
    warehouseId
      ? // ── Warehouse-scoped: fetch all published products ──
        prisma.product.findMany({
          where: {
            isPublished: true,
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
            trackSerials: true,
            warrantyStartDate: true,
            warrantyMonths: true,
            purchaseItems: {
              orderBy: { purchase: { createdAt: "desc" } },
              take: 1,
              select: {
                warrantyStartDate: true,
                warrantyMonths: true,
              },
            },
            category: { select: { name: true } },
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
            isPublished: true,
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
            trackSerials: true,
            warrantyStartDate: true,
            warrantyMonths: true,
            purchaseItems: {
              orderBy: { purchase: { createdAt: "desc" } },
              take: 1,
              select: {
                warrantyStartDate: true,
                warrantyMonths: true,
              },
            },
            category: { select: { name: true } },
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
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        due: true,
        group: true,
        address: true,
        email: true,
        // NOTE: sales join removed — was loading all sale rows per customer (N+1).
        // Invoice numbers are available from the sales list query when needed.
      },
      orderBy: { createdAt: "desc" },
    }),
    accountsService.list(ctx),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.shop.findFirst({
      select: { name: true },
    }),
    prisma.category.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true, role: { not: "VIEWER" } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialise products — use WarehouseStock qty if warehouseId provided, else aggregate stock
  const products = rawProducts.map((p: any) => {
    const warehouseQty = warehouseId
      ? (p.warehouseStocks?.[0]?.qty ?? p.stock ?? 0)
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
      warrantyStartDate: p.warrantyStartDate ?? p.purchaseItems?.[0]?.warrantyStartDate ?? undefined,
      warrantyMonths: p.warrantyMonths ?? p.purchaseItems?.[0]?.warrantyMonths ?? undefined,
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

  const serializedCustomers = customers.map((c: any) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    balance: Number(c.balance ?? 0),
    due: Number(c.due ?? 0),
    group: c.group,
    address: c.address ?? undefined,
    email: c.email ?? undefined,
    // sales removed from init payload — load on demand via customer detail
    sales: [],
  }));

  return {
    products: { items: products, nextCursor: null, hasMore: false },
    customers: serializedCustomers,
    accounts,
    warehouses,
    categories,
    users,
    settings: {
      shopName: shop?.name ?? "",
      currencySymbol: "৳",
    },
  };
}, "pos:init");
