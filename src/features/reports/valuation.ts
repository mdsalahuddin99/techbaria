/**
 * Inventory valuation helpers.
 *
 * Three methods are supported as snapshot estimates from current
 * persisted state. We don't yet keep cost layers, so:
 *
 *  - latest:   stock × current costPrice (per product)
 *  - average:  stock × weighted average of recent purchase costs
 *              (falls back to costPrice when no purchase history)
 *  - fifo:     stock × cost of the most recent unconsumed receipts,
 *              consuming oldest receipts first using sales total qty.
 *              Falls back to costPrice for any leftover units.
 */
import type { Product, PurchaseOrder, Sale } from "@/shared/lib/types";

export type ValuationMethod = "latest" | "average" | "fifo";

export interface ValuationRow {
  productId: string;
  name: string;
  sku?: string;
  category: string;
  branch?: string;
  stock: number;
  unitCost: number;
  value: number;
}

interface Args {
  products: Product[];
  purchases: PurchaseOrder[];
  sales: Sale[];
  method: ValuationMethod;
  branchName?: string;
}

interface Layer {
  qty: number;
  cost: number;
  date: string;
}

function buildReceiptLayers(purchases: PurchaseOrder[]): Map<string, Layer[]> {
  const map = new Map<string, Layer[]>();
  const sorted = [...purchases].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  sorted.forEach((po) => {
    po.items.forEach((it) => {
      const recv = it.receivedQty ?? 0;
      if (recv <= 0) return;
      const layers = map.get(it.productId) ?? [];
      layers.push({ qty: recv, cost: it.costPrice, date: po.createdAt });
      map.set(it.productId, layers);
    });
  });
  return map;
}

function totalSold(sales: Sale[]): Map<string, number> {
  const map = new Map<string, number>();
  sales.forEach((s) =>
    s.items.forEach((i) => {
      map.set(i.productId, (map.get(i.productId) ?? 0) + i.qty);
    })
  );
  return map;
}

export function valuateInventory({
  products,
  purchases,
  sales,
  method,
  branchName,
}: Args): ValuationRow[] {
  const layers = method === "latest" ? null : buildReceiptLayers(purchases);
  const sold = method === "fifo" ? totalSold(sales) : null;

  return products
    .filter((p) => p.active)
    .map((p) => {
      let unitCost = p.costPrice;
      if (method === "average" && layers) {
        const ls = layers.get(p.id) ?? [];
        const totalQty = ls.reduce((s, l) => s + l.qty, 0);
        const totalVal = ls.reduce((s, l) => s + l.qty * l.cost, 0);
        if (totalQty > 0) unitCost = totalVal / totalQty;
      } else if (method === "fifo" && layers && sold) {
        let consumed = sold.get(p.id) ?? 0;
        const remaining = (layers.get(p.id) ?? []).map((l) => ({ ...l }));
        for (const layer of remaining) {
          if (consumed <= 0) break;
          const take = Math.min(layer.qty, consumed);
          layer.qty -= take;
          consumed -= take;
        }
        const remainingQty = remaining.reduce((s, l) => s + l.qty, 0);
        const remainingVal = remaining.reduce((s, l) => s + l.qty * l.cost, 0);
        if (remainingQty >= p.stock && remainingQty > 0) {
          unitCost = remainingVal / remainingQty;
        } else if (remainingQty > 0) {
          // mix of layered + fallback
          const fallback = (p.stock - remainingQty) * p.costPrice;
          unitCost = (remainingVal + fallback) / p.stock;
        }
      }
      const value = p.stock * unitCost;
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        branch: branchName,
        stock: p.stock,
        unitCost,
        value,
      };
    });
}

export function aggregateByCategory(rows: ValuationRow[]) {
  const map = new Map<string, { category: string; stock: number; value: number; products: number }>();
  rows.forEach((r) => {
    const cur = map.get(r.category) ?? { category: r.category, stock: 0, value: 0, products: 0 };
    cur.stock += r.stock;
    cur.value += r.value;
    cur.products += 1;
    map.set(r.category, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}
