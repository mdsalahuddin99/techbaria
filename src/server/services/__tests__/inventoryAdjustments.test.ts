import { inventoryService } from '@/server/services/inventoryService';
import { prisma } from '@/server/db/client';
import { vi, test, expect, describe, beforeEach } from 'vitest';
import { cache } from '@/lib/cache';

vi.mock('server-only', () => ({}));
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(cache, 'invalidateInventory').mockResolvedValue(undefined);
vi.spyOn(cache, 'invalidateSpecificProducts').mockResolvedValue(undefined);

describe('Inventory Adjustments Data Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Correctly adds stock and records adjustment log', async () => {
    const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
    const input = {
      productId: 'prod-1',
      qtyDelta: 5,
      reason: 'Found',
    } as any;

    const productFindSpy = vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 'prod-1',
      stock: 10,
      trackSerials: false
    } as any);

    const adjustmentCreateSpy = vi.fn().mockResolvedValue({ id: 'adj-1' });
    const productUpdateSpy = vi.fn().mockResolvedValue({});

    const tx = {
      product: {
        update: productUpdateSpy,
        findUnique: vi.fn().mockResolvedValue({ id: 'prod-1', trackSerials: false }),
      },
      stockAdjustment: {
        create: adjustmentCreateSpy,
      }
    } as any;

    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(tx));

    await inventoryService.adjust(ctx, input);

    expect(productUpdateSpy).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stock: { increment: 5 } }
    });

    expect(adjustmentCreateSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'prod-1',
        qtyDelta: 5,
        reason: 'Found',
        userId: 'user-1'
      })
    });

    productFindSpy.mockRestore();
    transactionSpy.mockRestore();
  });

  test('Correctly removes stock and records adjustment log', async () => {
    const ctx = { shopId: 'shop-1', branchId: 'branch-A', userId: 'user-1', role: 'ADMIN' } as any;
    const input = {
      productId: 'prod-1',
      qtyDelta: -3,
      reason: 'Damaged',
    } as any;

    const productFindSpy = vi.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 'prod-1',
      stock: 10,
      trackSerials: false
    } as any);

    const adjustmentCreateSpy = vi.fn().mockResolvedValue({ id: 'adj-1' });
    const productUpdateSpy = vi.fn().mockResolvedValue({});

    const tx = {
      product: {
        update: productUpdateSpy,
        findUnique: vi.fn().mockResolvedValue({ id: 'prod-1', trackSerials: false }),
      },
      stockAdjustment: {
        create: adjustmentCreateSpy,
      }
    } as any;

    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(tx));

    await inventoryService.adjust(ctx, input);

    expect(productUpdateSpy).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stock: { increment: -3 } }
    });

    expect(adjustmentCreateSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'prod-1',
        qtyDelta: -3,
      })
    });

    productFindSpy.mockRestore();
    transactionSpy.mockRestore();
  });
});
