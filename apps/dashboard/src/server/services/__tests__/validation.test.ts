import { salesService } from '@/server/services/salesService';
import { purchasesService } from '@/server/services/purchasesService';
import { prisma } from '@/server/db/client';
import { ServiceError } from '@/server/lib/errors';
import { cache } from '@/lib/cache';
import { vi, test, expect } from 'vitest';

// Mock Prisma warehouse lookup
(vi.spyOn(prisma.warehouse, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
  if (where.id === 'warehouse-1') {
    return { branchId: 'branch-A' } as any; // warehouse belongs to branch-A
  }
  return null;
});

// Suppress console warnings/logs in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(cache, 'invalidateSales').mockResolvedValue(undefined);
vi.spyOn(cache, 'invalidateSpecificProducts').mockResolvedValue(undefined);
vi.spyOn(cache, 'invalidatePurchases').mockResolvedValue(undefined);

test('salesService.create throws NOT_FOUND when customer does not exist', async () => {
  const customerSpy = vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue(null);
  
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1' } as any;
  const input = {
    branchId: 'branch-A',
    customerId: 'cust-other-shop',
    items: [{ productId: 'prod-1', qty: 1, price: 10 }],
    tenders: [{ type: 'Cash', amount: 10 }],
  } as any;

  await expect(salesService.create(ctx, input)).rejects.toThrow('Customer not found');

  expect(customerSpy).toHaveBeenCalledWith({
    where: { id: 'cust-other-shop' },
    select: { id: true },
  });

  customerSpy.mockRestore();
});

test('salesService.create throws VALIDATION when financial account is invalid', async () => {
  const accountSpy = vi.spyOn(prisma.financialAccount, 'findMany').mockResolvedValue([]);
  
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1' } as any;
  const input = {
    branchId: 'branch-A',
    items: [{ productId: 'prod-1', qty: 1, price: 10 }],
    tenders: [{ type: 'Cash', amount: 10, accountId: 'acc-other-shop' }],
  } as any;

  await expect(salesService.create(ctx, input)).rejects.toThrow('Invalid or unauthorized financial account');

  expect(accountSpy).toHaveBeenCalledWith({
    where: { id: { in: ['acc-other-shop'] } },
    select: { id: true },
  });

  accountSpy.mockRestore();
});

test('purchasesService.create throws NOT_FOUND when supplier does not exist', async () => {
  const supplierSpy = vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue(null);
  
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
  const input = {
    branchId: 'branch-A',
    supplierId: 'supplier-other-shop',
    items: [{ productId: 'prod-1', qty: 5, cost: 10 }],
  } as any;

  await expect(purchasesService.create(ctx, input)).rejects.toThrow('Supplier not found');

  expect(supplierSpy).toHaveBeenCalledWith({
    where: { id: 'supplier-other-shop' },
    select: { id: true },
  });

  supplierSpy.mockRestore();
});

test('purchasesService.create throws VALIDATION when financial account is invalid', async () => {
  const accountSpy = vi.spyOn(prisma.financialAccount, 'findMany').mockResolvedValue([]);
  
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
  const input = {
    branchId: 'branch-A',
    items: [{ productId: 'prod-1', qty: 5, cost: 10 }],
    tenders: [{ type: 'Cash', amount: 50, accountId: 'acc-other-shop' }],
  } as any;

  await expect(purchasesService.create(ctx, input)).rejects.toThrow('Invalid or unauthorized financial account');

  expect(accountSpy).toHaveBeenCalledWith({
    where: { id: { in: ['acc-other-shop'] } },
    select: { id: true },
  });

  accountSpy.mockRestore();
});

test('purchasesService.addPayment throws NOT_FOUND when financial account is invalid', async () => {
  const purchaseSpy = vi.spyOn(prisma.purchase, 'findFirst').mockResolvedValue({ id: 'purchase-1', paid: 0, total: 100 } as any);
  const accountSpy = vi.spyOn(prisma.financialAccount, 'findFirst').mockResolvedValue(null);
  
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
  const payment = { amount: 50, method: 'Cash', accountId: 'acc-other-shop' };

  await expect(purchasesService.addPayment(ctx, 'purchase-1', payment)).rejects.toThrow('Financial account not found');

  expect(accountSpy).toHaveBeenCalledWith({
    where: { id: 'acc-other-shop' },
    select: { id: true },
  });

  purchaseSpy.mockRestore();
  accountSpy.mockRestore();
});

test('salesService.create calculates and persists warrantyExpiryDate correctly', async () => {
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1' } as any;
  const input = {
    branchId: 'branch-A',
    customerId: 'cust-1',
    items: [
      { productId: 'prod-1', qty: 1, price: 100, warrantyMonths: 12, serials: ['SN123'] }
    ],
    tenders: [
      { type: 'Cash', amount: 100 }
    ]
  } as any;

  // Mock pre-transaction queries
  const customerSpy = vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as any);
  const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

  // Mock tx methods
  const updateManySpy = vi.fn().mockResolvedValue({ count: 1 });
  const tx = {
    product: {
      findMany: vi.fn().mockResolvedValue([{ id: 'prod-1', name: 'Product 1', trackSerials: true, cost: 50, stock: 10 }]),
      findFirst: vi.fn().mockResolvedValue({ id: 'prod-1', trackSerials: true }),
      findUnique: vi.fn().mockResolvedValue({ id: 'prod-1', trackSerials: true }),
      update: vi.fn().mockResolvedValue({} as any),
    },
    shop: {
      findUnique: vi.fn().mockResolvedValue({ settings: {} }),
      findFirst: vi.fn().mockResolvedValue({ settings: {} }),
    },
    warehouseStock: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    serialNumber: {
      groupBy: vi.fn().mockResolvedValue([{ productId: 'prod-1', _count: { productId: 10 } }]),
      findMany: vi.fn().mockResolvedValue([{ id: 'sn-1', productId: 'prod-1', serial: 'SN123', status: 'IN_STOCK' }]),
      updateMany: updateManySpy,
      count: vi.fn().mockResolvedValue(10), // mock reconciliation count
    },
    sale: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({
        id: 'sale-1',
        shopId: 'shop-1',
        userId: 'user-1',
        branchId: 'branch-A',
        customerId: 'cust-1',
        channel: 'POS',
        status: 'COMPLETED',
        subtotal: 100, discount: 0, total: 100, paid: 100, due: 0,
        createdAt: new Date(),
        items: [
          {
            id: 'sale-item-1',
            productId: 'prod-1',
            name: 'Product 1',
            qty: 1,
            price: 100,
            cost: 50,
            discount: 0,
            warrantyMonths: 12,
            serialNumbers: [],
          }
        ],
        tenders: [
          { type: 'CASH', amount: 100 }
        ]
      }),
    }
  } as any;

  const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
    return cb(tx);
  });

  const res = await salesService.create(ctx, input);

  expect(res.id).toBe('sale-1');
  expect(tx.sale.create).toHaveBeenCalled();
  
  // Verify that serialNumber.updateMany was called with the calculated warrantyExpiryDate
  expect(updateManySpy).toHaveBeenCalled();
  const updateCallArgs = updateManySpy.mock.calls[0][0];
  expect(updateCallArgs.where.id.in).toContain('sn-1');
  expect(updateCallArgs.data.status).toBe('SOLD');
  expect(updateCallArgs.data.warrantyExpiryDate).toBeInstanceOf(Date);
  
  // Expiry date should be roughly 12 months from now
  const expiry = updateCallArgs.data.warrantyExpiryDate;
  const expectedExpiry = new Date();
  expectedExpiry.setMonth(expectedExpiry.getMonth() + 12);
  expect(expiry.getFullYear()).toBe(expectedExpiry.getFullYear());
  expect(expiry.getMonth()).toBe(expectedExpiry.getMonth());

  // Restore mocks
  customerSpy.mockRestore();
  auditSpy.mockRestore();
  transactionSpy.mockRestore();
});

test('salesService.void resets warrantyExpiryDate to null and sets status to IN_STOCK', async () => {
  const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
  
  const updateManySpy = vi.fn().mockResolvedValue({ count: 1 });
  
  const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

  const tx = {
    sale: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'sale-1',
        shopId: 'shop-1',
        status: 'COMPLETED',
        due: 0,
        customerId: 'cust-1',
        items: [
          { id: 'sale-item-1', productId: 'prod-1', qty: 1 }
        ],
        tenders: [
          { type: 'CASH', amount: 100 }
        ]
      }),
      update: vi.fn().mockResolvedValue({
        id: 'sale-1',
        status: 'VOIDED',
        createdAt: new Date(),
        items: [],
        tenders: []
      })
    },
    product: {
      findMany: vi.fn().mockResolvedValue([{ id: 'prod-1', trackSerials: true }]),
      findFirst: vi.fn().mockResolvedValue({ id: 'prod-1', trackSerials: true }),
      findUnique: vi.fn().mockResolvedValue({ id: 'prod-1', trackSerials: true }),
      update: vi.fn().mockResolvedValue({} as any),
    },
    serialNumber: {
      updateMany: updateManySpy,
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(10),
    },
    warehouseStock: {
      upsert: vi.fn().mockResolvedValue({} as any),
    },
    customer: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: 0, due: 0 }),
    },
    customerTransaction: {
      create: vi.fn().mockResolvedValue({}),
    }
  } as any;

  const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
    return cb(tx);
  });

  await salesService.void(ctx, 'sale-1', 'Void reason');

  expect(tx.sale.findFirst).toHaveBeenCalled();
  expect(updateManySpy).toHaveBeenCalledWith({
    where: { saleItemId: { in: ['sale-item-1'] } },
    data: { status: 'IN_STOCK', saleItemId: null, soldAt: null, warrantyExpiryDate: null }
  });

  auditSpy.mockRestore();
  transactionSpy.mockRestore();
});
