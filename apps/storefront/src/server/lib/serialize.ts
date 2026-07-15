/**
 * Serialization layer — transforms Prisma raw objects to frontend DTOs.
 *
 * Every service returns raw Prisma types (with nested relations).
 * The frontend expects flattened / renamed fields (DTOs).
 *
 * Meta-data beyond the Prisma schema is stored inline in the `notes`
 * field as a JSON string with the shape:
 *   { "_m": { ...meta }, "_n": "actual notes text" }
 *
 * This avoids the need for DB migrations to add new columns.
 */
import type {
  PurchaseOrder,
  PurchaseItem as PurchaseItemDTO,
  PurchasePayment,
  PurchaseStatus,
} from "@/features/purchases/types";
import type { Sale, PaymentMethod, SalePayment } from "@/features/sales/types";
import type { StorefrontOrder } from "@/features/storefront/types";
import type { Prisma, $Enums } from "@prisma/client";

// ─── Helper: Decimal → number ──────────────────────────────────────────────

function toNumber(val: Prisma.Decimal | null | undefined): number {
  return val ? Number(val) : 0;
}

// ─── Notes-embedded metadata helpers ────────────────────────────────────────

interface NotesMeta {
  _m?: Record<string, unknown>;
  _n?: string;
}

function encodeNotes(
  notes: string | undefined,
  meta: Record<string, unknown>,
): string {
  const payload: NotesMeta = {};
  if (meta && Object.keys(meta).length > 0) payload._m = meta;
  if (notes) payload._n = notes;
  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : "";
}

function decodeNotes(raw: string | null | undefined): { notes: string; meta: Record<string, unknown> } {
  if (!raw) return { notes: "", meta: {} };
  try {
    const parsed = JSON.parse(raw) as NotesMeta;
    if (parsed?._m || parsed?._n !== undefined) {
      return {
        notes: parsed._n ?? "",
        meta: parsed._m ?? {},
      };
    }
  } catch { /* not JSON, regular text */ }
  return { notes: raw, meta: {} };
}

interface PurchaseMeta {
  status?: string;
  expectedDate?: string;
  receivedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE
// ═══════════════════════════════════════════════════════════════════════════

type PrismaPurchase = Prisma.PurchaseGetPayload<{
  include: { supplier: true; items: true; tenders: true };
}>;

export function serializePurchase(raw: PrismaPurchase): PurchaseOrder {
  const { notes, meta } = decodeNotes(raw.notes);
  const m = meta as PurchaseMeta;
  return {
    id: raw.id,
    poNumber: raw.invoiceNo ?? "",
    supplierId: raw.supplierId ?? "",
    supplierName: raw.supplier?.name ?? "Unknown",
    items: raw.items.map((item) => serializePurchaseItem(item)),
    subtotal: toNumber(raw.subtotal),
    discount: toNumber(raw.discount),
    amountPaid: toNumber(raw.paid),
    status: (m.status ?? "Ordered") as PurchaseStatus,
    expectedDate: m.expectedDate,
    createdAt: raw.createdAt.toISOString(),
    receivedAt: m.receivedAt,
    note: notes,
    payments: (raw.tenders ?? []).map((t): PurchasePayment => ({
      id: t.id,
      date: raw.createdAt.toISOString(),
      amount: toNumber(t.amount),
      method: mapTenderTypeToPaymentMethod(t.type),
      accountId: t.accountId ?? undefined,
    })),
  };
}

function serializePurchaseItem(
  raw: Prisma.PurchaseItemGetPayload<object>,
): PurchaseItemDTO {
  return {
    productId: raw.productId,
    name: raw.name ?? "",
    qty: raw.qty,
    receivedQty: raw.qty,
    costPrice: toNumber(raw.cost),
    extraCost: (raw as any).extraCost ? Number((raw as any).extraCost) : undefined,
    salePrice: raw.salePrice ? Number(raw.salePrice) : undefined,
    serials: raw.serials?.length ? raw.serials : undefined,
    warrantyStartDate: raw.warrantyStartDate ? new Date(raw.warrantyStartDate).toISOString() : undefined,
    warrantyMonths: raw.warrantyMonths ?? undefined,
  };
}

function mapTenderTypeToPaymentMethod(type: string): PaymentMethod {
  const map: Record<string, PaymentMethod> = {
    CASH: "Cash",
    BANK: "Card",
    BKASH: "Mobile Banking",
    NAGAD: "Mobile Banking",
    ROCKET: "Mobile Banking",
    CARD: "Card",
    DUE: "Cash",
  };
  return map[type] ?? "Cash";
}

/** Reverse map: frontend payment method → Prisma TenderType enum. */
export function mapPaymentMethodToTenderType(method: string): $Enums.TenderType {
  const map: Record<string, $Enums.TenderType> = {
    Cash: "CASH",
    Card: "CARD",
    "Mobile Banking": "BKASH",
    Bank: "BANK",
    Due: "DUE",
    Wallet: "WALLET",
  };
  return map[method] ?? "CASH";
}

// ═══════════════════════════════════════════════════════════════════════════
// SALE
// ═══════════════════════════════════════════════════════════════════════════

type PrismaSale = Prisma.SaleGetPayload<{
  include: { items: true; tenders: true; customer: true; user: true; editedBy: true };
}> & {
  items: Array<{ serialNumbers?: Array<{ serial: string }> } & Record<string, any>>;
};

export function serializeSale(raw: PrismaSale): Sale {
  const paid = toNumber(raw.paid);
  const total = toNumber(raw.total);
  const d = (raw.data ?? {}) as Record<string, any>;
  return {
    id: raw.id,
    invoiceNo: (d.invoiceNo as string) ?? raw.id.slice(0, 8).toUpperCase(),
    date: raw.createdAt.toISOString(),
    customerId: raw.customerId,
    customerName: raw.customer?.name ?? "Walk-in",
    customerPhone: raw.customer?.phone ?? undefined,
    customerReferencePerson: raw.customer?.referencePerson ?? undefined,
    customerEmail: raw.customer?.email ?? undefined,
    customerAddress: raw.customer?.address ?? undefined,
    items: (raw.items ?? []).map((i: typeof raw.items[number] & { serialNumbers?: Array<{ serial: string }> }) => ({
      productId: i.productId,
      name: i.name ?? "",
      price: toNumber(i.price),
      qty: i.qty,
      warrantyMonths: i.warrantyMonths ?? undefined,
      serials: i.serialNumbers?.map((sn) => sn.serial) ?? undefined,
    })),
    subtotal: toNumber(raw.subtotal),
    discount: toNumber(raw.discount),
    total,
    vat: toNumber(d.vat),
    extraCharges: toNumber(d.extraCharges),
    salesPerson: d.salesPerson as string | undefined,
    destination: d.destination as string | undefined,
    attention: d.attention as string | undefined,
    notes: raw.notes ?? undefined,
    paymentMethod: mapTenderTypeToPaymentMethod(raw.tenders?.[0]?.type),
    amountPaid: paid,
    change: Math.max(0, paid - total),
    cashier: raw.user?.role ?? raw.user?.name ?? "Unknown",
    editedBy: raw.editedBy?.name ?? raw.editedBy?.email ?? null,
    editedAt: raw.editedAt?.toISOString() ?? null,
    payments: (raw.tenders ?? []).map((t): SalePayment => ({
      method: mapTenderTypeToPaymentMethod(t.type),
      amount: toNumber(t.amount),
      accountId: t.accountId,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// STOREFRONT ORDER
// ═══════════════════════════════════════════════════════════════════════════

type PrismaStorefrontSale = Prisma.SaleGetPayload<{
  include: { items: true };
}>;

/**
 * Serialize a Sale (channel=STOREFRONT) into the StorefrontOrder DTO.
 * Reads storefront-specific metadata from the `data` JSON column.
 */
export function serializeStorefrontOrder(raw: PrismaStorefrontSale): StorefrontOrder {
  const d = raw.data as Record<string, unknown> | undefined ?? {};
  const customerData = d.customer as Record<string, unknown> | undefined ?? {};
  const shippingData = d.shipping as Record<string, unknown> | undefined ?? {};

  return {
    id: raw.id,
    orderNo: (d.orderNo as string) ?? raw.id.slice(0, 8).toUpperCase(),
    createdAt: raw.createdAt.toISOString(),
    items: (raw.items ?? []).map((i) => ({
      productId: i.productId,
      name: i.name,
      price: Number(i.price),
      emoji: "📦",
      imageUrl: undefined,
      qty: i.qty,
      maxStock: i.qty,
    })),
    subtotal: Number(raw.subtotal),
    shipping: Number(shippingData.cost) || 0,
    discount: Number(raw.discount),
    total: Number(raw.total),
    shippingMethod: (shippingData.method as StorefrontOrder["shippingMethod"]) ?? "inside_dhaka",
    paymentMethod: (d.paymentMethod as StorefrontOrder["paymentMethod"]) ?? "cod",
    address: {
      fullName: (customerData.fullName as string) ?? "",
      phone: (customerData.phone as string) ?? "",
      email: (customerData.email as string) ?? undefined,
      address: (customerData.address as string) ?? "",
      city: (customerData.city as string) ?? "",
      area: customerData.area as string | undefined,
      postcode: customerData.postcode as string | undefined,
      notes: customerData.notes as string | undefined,
    },
    status: (d.storefrontStatus as StorefrontOrder["status"]) ?? "pending",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT
// ═══════════════════════════════════════════════════════════════════════════

type PrismaProduct = Prisma.ProductGetPayload<{
  include: { images: true; category: true };
}>;

export interface ProductDTO {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  slug: string;
  description: string | null;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number | null;
  unit: string | null;
  active: boolean;
  isPublished: boolean;
  trackSerials: boolean;
  warrantyMonths: number | null;
  warrantyStartDate: string | null;
  categoryId: string | null;
  categoryName: string | null;
  images: Array<{ url: string; alt: string | null }>;
  createdAt: string;
  updatedAt: string;
}

export function serializeProduct(raw: PrismaProduct): ProductDTO {
  return {
    id: raw.id,
    name: raw.name,
    sku: raw.sku ?? "",
    barcode: raw.barcode,
    slug: raw.slug,
    description: raw.description,
    price: toNumber(raw.price),
    costPrice: toNumber(raw.cost),
    stock: raw.stock,
    reorderLevel: raw.reorderLevel,
    unit: raw.unit,
    active: true,
    isPublished: raw.isPublished,
    trackSerials: raw.trackSerials,
    warrantyMonths: raw.warrantyMonths ?? null,
    warrantyStartDate: raw.warrantyStartDate ? new Date(raw.warrantyStartDate).toISOString() : null,
    categoryId: raw.categoryId,
    categoryName: raw.category?.name ?? null,
    images: (raw.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt,
    })),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════

type PrismaAccount = Prisma.FinancialAccountGetPayload<object>;

export interface AccountDTO {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  openingBalance: number;
  balance: number;
  archived: boolean;
  isDefault: boolean;
}

export function serializeAccount(raw: PrismaAccount): AccountDTO {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    parentId: raw.parentId,
    openingBalance: toNumber(raw.openingBalance),
    balance: toNumber(raw.balance),
    archived: raw.archived,
    isDefault: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER
// ═══════════════════════════════════════════════════════════════════════════

type PrismaCustomer = Prisma.CustomerGetPayload<object>;

export function serializeCustomer(raw: PrismaCustomer): any {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone ?? "",
    email: raw.email ?? undefined,
    address: raw.address ?? undefined,
    due: toNumber(raw.due),
    balance: toNumber(raw.balance),
    creditLimit: toNumber(raw.creditLimit),
    totalSpent: toNumber(raw.totalSpent),
    loyaltyPoints: raw.loyaltyPoints ?? 0,
    group: raw.group ?? undefined,
    referencePerson: raw.referencePerson ?? undefined,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt.toISOString(),
  };
}

export { encodeNotes, decodeNotes };
