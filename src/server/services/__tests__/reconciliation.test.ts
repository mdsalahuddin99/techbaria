vi.mock('server-only', () => ({}));
import { describe, test, expect, vi } from "vitest";
import { inventoryService } from "../inventoryService";

describe("inventoryService.syncStockCount reconciliation logic", () => {
  test("reconciles WarehouseStock and Product stock with physical IN_STOCK serial count", async () => {
    const shopId = "shop-test-1";
    const warehouseId = "warehouse-test-1";
    const productId = "product-test-1";

    const upsertSpy = vi.fn();
    const updateSpy = vi.fn();

    // Mock transaction client (tx)
    const tx = {
      product: {
        findFirst: vi.fn().mockResolvedValue({ id: productId, trackSerials: true }),
        update: updateSpy.mockResolvedValue({ id: productId, stock: 10 }),
      },
      serialNumber: {
        count: vi.fn()
          // First call: count for warehouseId
          .mockResolvedValueOnce(3)
          // Second call: count globally for shopId
          .mockResolvedValueOnce(10),
      },
      warehouseStock: {
        upsert: upsertSpy.mockResolvedValue({ warehouseId, productId, qty: 3 }),
      },
    } as any;

    await inventoryService.syncStockCount(tx, shopId, warehouseId, productId);

    // Verify product status query
    expect(tx.product.findFirst).toHaveBeenCalledWith({
      where: { id: productId, shopId },
      select: { trackSerials: true },
    });

    // Verify counts are queried correctly
    expect(tx.serialNumber.count).toHaveBeenNthCalledWith(1, {
      where: { productId, warehouseId, status: "IN_STOCK", shopId },
    });
    expect(tx.serialNumber.count).toHaveBeenNthCalledWith(2, {
      where: { productId, status: "IN_STOCK", shopId },
    });

    // Verify upsert is called to correct the warehouse stock to 3
    expect(upsertSpy).toHaveBeenCalledWith({
      where: { warehouseId_productId: { warehouseId, productId } },
      create: { warehouseId, productId, qty: 3 },
      update: { qty: 3 },
    });

    // Verify product update is called to correct total stock to 10
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: productId },
      data: { stock: 10 },
    });
  });

  test("skips reconciliation if product does not track serials", async () => {
    const shopId = "shop-test-1";
    const warehouseId = "warehouse-test-1";
    const productId = "product-test-1";

    const tx = {
      product: {
        findFirst: vi.fn().mockResolvedValue({ id: productId, trackSerials: false }),
      },
      serialNumber: {
        count: vi.fn(),
      },
    } as any;

    await inventoryService.syncStockCount(tx, shopId, warehouseId, productId);

    expect(tx.serialNumber.count).not.toHaveBeenCalled();
  });
});
