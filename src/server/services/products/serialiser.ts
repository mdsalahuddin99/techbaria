import { prisma } from "@/server/db/client";

type PrismaProduct = NonNullable<Awaited<ReturnType<typeof prisma.product.findFirst>>>;

export function serialise(product: PrismaProduct[]): any[];
export function serialise(product: PrismaProduct): any;
export function serialise(product: any): any {
  if (Array.isArray(product)) return product.map((p) => serialiseOne(p));
  return serialiseOne(product);
}

export function serialiseOne(p: any) {
  return {
    ...p,
    // Override Decimal fields from spread with plain numbers
    price: Number(p.price),
    category: (p as any).category?.name ?? (p as any).category ?? "",
    // Frontend type uses `active` but Prisma stores `isPublished`
    active: p.isPublished,
    // Frontend type uses `costPrice` but Prisma stores `cost`
    costPrice: Number(p.cost),
    // Frontend type uses `wholesalePrice` — now stored directly
    wholesalePrice: Number(p.wholesalePrice ?? 0),
    // Frontend type uses `minStock` but Prisma stores `reorderLevel`
    minStock: p.reorderLevel,
    // Frontend type uses `imageUrl` but Prisma stores images as relation array
    imageUrl: ((p as any).images as Array<{ url: string }> | undefined)?.[0]?.url ?? "",
    description: p.description ?? "",
    shortDescription: p.shortDescription ?? "",
    // Extended fields — expose both display names AND FK IDs for edit form
    emoji: p.emoji ?? "📦",
    brand: p.brand?.name ?? p.brand ?? "",
    brandId: p.brandId ?? p.brand?.id ?? undefined,
    model: p.model?.name ?? p.model ?? "",
    modelId: p.modelId ?? p.model?.id ?? undefined,
    catalogProductId: p.model?.productId ?? undefined,
    subcategory: p.subcategory ?? "",
    series: p.series?.name ?? p.series ?? "",
    seriesId: p.seriesId ?? p.series?.id ?? undefined,
    color: p.color ?? "",
    storage: p.storage ?? "",
    ram: p.ram ?? "",
    condition: p.condition ?? undefined,
    trackSerials: p.trackSerials ?? true,
    supplierId: p.supplierId ?? null,
    warrantyStartDate: p.warrantyStartDate ?? undefined,
    warrantyMonths: p.warrantyMonths ?? undefined,
    serialNumber: "",
    imei: "",
    defaultDiscount: undefined,
    type: "simple" as const,
    components: [],
    serials: (p.serialNumbers ?? []).map((s: any) => ({
      imei: undefined,
      serialNumber: s.serial ?? undefined,
      status: "in_stock" as const,
      id: s.id ?? "",
      receivedAt: undefined,
      warrantyStartDate: s.purchaseItem?.warrantyStartDate
        ? new Date(s.purchaseItem.warrantyStartDate).toISOString().slice(0, 10)
        : undefined,
      warrantyMonths: s.purchaseItem?.warrantyMonths ?? undefined,
      soldInSaleId: undefined,
      note: undefined,
    })),
  };
}
