/**
 * Test helper — mocks the service layer so feature hooks return mock data.
 *
 * WARNING: This file must NOT import from @/features/*, @/services, @/store,
 * or any module that transitively imports @/services, because vi.mock()
 * hoisting creates circular dependencies.
 *
 * Usage in a test file:
 *   import { mockServices, mockProducts, seedQueryClient } from "@/test/mock-api";
 *
 *   vi.mock("@/services", () => mockServices);
 *
 *   it("works", () => {
 *     const qc = new QueryClient();
 *     seedQueryClient(qc);
 *     ...
 *   });
 */
import type { QueryClient } from "@tanstack/react-query";

// ─── Inline query keys matching createQueryKeys output ────────────────────
// Each list key is ["entity", "list", {}] — same as the actual queryKeys module.

const root = (name: string) => [name] as const;
const productKeys = { list: () => [...root("products"), "list", {}] as const };
const customerKeys = { list: () => [...root("customers"), "list", {}] as const };
const supplierKeys = { list: () => [...root("suppliers"), "list", {}] as const };
const saleKeys = { list: () => [...root("sales"), "list", {}] as const };

// ─── Mock data ─────────────────────────────────────────────────────────────

export const mockProducts = [
  { id: "p1", name: "Hikvision 2MP Dome Camera", sku: "CAM-HIK-DM2", barcode: "8901201000001", category: "CCTV Camera", price: 1850, costPrice: 1450, stock: 25, minStock: 5, unit: "pcs", active: true, emoji: "📹", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24, type: "simple" as const, images: [], branchId: "branch-A" },
  { id: "p2", name: "Hikvision 5MP Bullet Camera", sku: "CAM-HIK-BL5", barcode: "8901202000000", category: "CCTV Camera", price: 2950, costPrice: 2350, stock: 18, minStock: 5, unit: "pcs", active: true, emoji: "📹", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24, type: "simple" as const, images: [], branchId: "branch-A" },
  { id: "p3", name: "Dahua 2MP IP Bullet Camera", sku: "CAM-DAH-IP2", barcode: "8901203000009", category: "CCTV Camera", price: 4200, costPrice: 3450, stock: 12, minStock: 3, unit: "pcs", active: true, emoji: "📹", supplierId: "sup2", brand: "Dahua", warrantyMonths: 24, type: "simple" as const, images: [], branchId: "branch-A" },
  { id: "p4", name: "Dahua 4MP PTZ Camera", sku: "CAM-DAH-PTZ4", barcode: "8901204000008", category: "CCTV Camera", price: 28500, costPrice: 24500, stock: 4, minStock: 1, unit: "pcs", active: true, emoji: "📹", supplierId: "sup2", brand: "Dahua", warrantyMonths: 24, type: "simple" as const, images: [], branchId: "branch-A" },
  { id: "p7", name: "Hikvision 4-Ch DVR", sku: "DVR-HIK-4CH", barcode: "8902201000008", category: "DVR / NVR", price: 6500, costPrice: 5400, stock: 10, minStock: 3, unit: "pcs", active: true, emoji: "🎛️", supplierId: "sup1", brand: "Hikvision", warrantyMonths: 24, type: "simple" as const, images: [], branchId: "branch-A" },
  { id: "p16", name: "12V 10A SMPS", sku: "PWR-SMPS-10A", barcode: "8905201000009", category: "Power Supply", price: 950, costPrice: 650, stock: 30, minStock: 8, unit: "pcs", active: true, emoji: "🔌", supplierId: "sup5", brand: "Generic", warrantyMonths: 6, type: "simple" as const, images: [], branchId: "branch-A" },
  { id: "p25", name: "PoE Switch 8-Port", sku: "ACC-POE-8P", barcode: "8907205000009", category: "Accessories", price: 6500, costPrice: 5400, stock: 8, minStock: 2, unit: "pcs", active: true, emoji: "🔧", supplierId: "sup2", brand: "Dahua", warrantyMonths: 12, type: "simple" as const, images: [], branchId: "branch-A" },
];

export const mockCustomers = [
  { id: "c1", name: "Rahim Electronics", phone: "01711-111111", email: "", address: "Dhaka", due: 12000, dueBalance: 12000, notes: "", createdAt: "2024-01-15T10:00:00Z" },
  { id: "c2", name: "Karim Security Solutions", phone: "01811-222222", email: "", address: "Dhaka", due: 0, dueBalance: 0, notes: "", createdAt: "2024-02-20T10:00:00Z" },
];

export const mockSuppliers = [
  { id: "sup1", name: "Star Tech BD", phone: "01711-100001", email: "sales@startech.bd", address: "Mohakhali, Dhaka", payableBalance: 45000, createdAt: "2024-02-10T10:00:00Z" },
  { id: "sup2", name: "Apple Gadget World BD", phone: "01811-200002", email: "info@gadgetworld.bd", address: "Bashundhara, Dhaka", payableBalance: 120000, createdAt: "2024-03-05T10:00:00Z" },
];

export const mockSales = [
  { id: "s1", invoiceNo: "INV-001", customerId: "c1", channel: "POS", status: "COMPLETED", subtotal: 1000, discount: 0, total: 1000, paid: 1000, due: 0, date: "2025-01-10T10:00:00Z", items: [{ productId: "p1", name: "Hikvision 2MP Dome Camera", qty: 1, price: 1850 }], tenders: [{ type: "CASH", amount: 1000 }], createdAt: "2025-01-10T10:00:00Z" },
  { id: "s2", invoiceNo: "INV-002", customerId: null, channel: "POS", status: "COMPLETED", subtotal: 2000, discount: 0, total: 2000, paid: 2000, due: 0, date: "2025-01-11T10:00:00Z", items: [{ productId: "p2", name: "Hikvision 5MP Bullet Camera", qty: 1, price: 2950 }], tenders: [{ type: "CASH", amount: 2000 }], createdAt: "2025-01-11T10:00:00Z" },
];

// ─── Mock service implementations ──────────────────────────────────────────

function delay(ms = 5) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockServices = {
  productsService: {
    list: async (_filter?: any) => { await delay(); return { items: [...mockProducts] }; },
    getById: async (id: string) => { await delay(); return mockProducts.find((p) => p.id === id) ?? null; },
    getByBarcode: async (code: string) => { await delay(); return mockProducts.find((p) => p.barcode === code) ?? null; },
  },
  customersService: {
    list: async (_search?: string) => { await delay(); return { items: [...mockCustomers] }; },
    getById: async (id: string) => { await delay(); return mockCustomers.find((c) => c.id === id) ?? null; },
    withDues: async () => { await delay(); return mockCustomers.filter((c) => c.dueBalance > 0); },
  },
  suppliersService: {
    list: async () => { await delay(); return { items: [...mockSuppliers] }; },
    getById: async (id: string) => { await delay(); return mockSuppliers.find((s) => s.id === id) ?? null; },
  },
  salesService: {
    list: async (_channel?: string, _customerId?: string) => { await delay(); return { items: [...mockSales] }; },
    listReturns: async () => { await delay(); return [] as any[]; },
    byCustomer: async (customerId: string) => { await delay(); return mockSales.filter((s) => s.customerId === customerId); },
    getById: async (id: string) => { await delay(); return mockSales.find((s) => s.id === id) ?? null; },
  },
};

// ─── QueryClient seeding ───────────────────────────────────────────────────

export function seedQueryClient(qc: QueryClient) {
  qc.setQueryData(productKeys.list(), { items: [...mockProducts] });
  qc.setQueryData(customerKeys.list(), { items: [...mockCustomers] });
  qc.setQueryData(supplierKeys.list(), { items: [...mockSuppliers] });
  qc.setQueryData(saleKeys.list(), { items: [...mockSales] });
}
