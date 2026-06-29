import { salesService } from '@/server/services/salesService';
import { prisma } from '@/server/db/client';
import { vi, test, expect, describe } from 'vitest';
import { cache } from '@/lib/cache';

vi.mock('server-only', () => ({}));
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(cache, 'invalidateSales').mockResolvedValue(undefined);
vi.spyOn(cache, 'invalidateSpecificProducts').mockResolvedValue(undefined);

describe('Sales Calculations and Data Integrity', () => {
  test('Correctly calculates subtotal, discount, extra charges, VAT, total, and due amounts', async () => {
    // 1. Setup fake context and inputs
    const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
    const input = {
      branchId: 'branch-A',
      customerId: 'cust-1',
      items: [
        { productId: 'prod-1', qty: 2, price: 500, discount: 50 }, // subtotal: 1000 - 50 = 950
        { productId: 'prod-2', qty: 1, price: 200, discount: 0 }   // subtotal: 200
      ],
      discount: 100, // cart level discount
      vat: 50,
      extraCharges: 20,
      tenders: [
        { type: 'Cash', amount: 500 },
        { type: 'Due', amount: 620 }
      ]
    } as any;

    // Expected Math:
    // Subtotal: 950 + 200 = 1150
    // Total: Subtotal (1150) - cart discount (100) + vat (50) + extraCharges (20) = 1120
    // Paid (excluding Due): 500
    // Due: max(0, 1120 - 500) = 620

    // 2. Mock Prisma Queries
    const customerSpy = vi.spyOn(prisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as any);
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

    const saleCreateSpy = vi.fn().mockResolvedValue({
      id: 'sale-1', items: [], tenders: [], customer: {}, user: {}, createdAt: new Date(), data: {}
    });

    const tx = {
      product: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'prod-1', name: 'Prod 1', trackSerials: false, cost: 300, stock: 10 },
          { id: 'prod-2', name: 'Prod 2', trackSerials: false, cost: 100, stock: 5 },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
      shop: {
        findFirst: vi.fn().mockResolvedValue({ settings: {} }),
      },
      sale: {
        count: vi.fn().mockResolvedValue(0),
        create: saleCreateSpy,
      },
      customer: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: 0, due: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      customerTransaction: {
        create: vi.fn().mockResolvedValue({}),
      }
    } as any;

    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(tx));

    // 3. Execute the service
    await salesService.create(ctx, input);

    // 4. Verify Calculations passed to Database
    expect(saleCreateSpy).toHaveBeenCalled();
    const createArgs = saleCreateSpy.mock.calls[0][0].data;
    
    expect(createArgs.subtotal).toBe(1150);
    expect(createArgs.discount).toBe(100);
    expect(createArgs.total).toBe(1120);
    expect(createArgs.paid).toBe(500);
    expect(createArgs.due).toBe(620);
    expect(createArgs.data.vat).toBe(50);
    expect(createArgs.data.extraCharges).toBe(20);

    // Verify stock deduction relationships
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' }, data: { stock: { decrement: 2 } }
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-2' }, data: { stock: { decrement: 1 } }
    });

    // Cleanup
    customerSpy.mockRestore();
    auditSpy.mockRestore();
    transactionSpy.mockRestore();
  });
});
