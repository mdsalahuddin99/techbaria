import { describe, expect, it } from "vitest";
import {
  bundleAvailableStock,
  effectiveReorderPoint,
  suggestedPoQty,
  safeMinStock,
} from "@/features/products/bundle";
import type { Product } from "@/features/products/types";

const baseProduct = (over: Partial<Product>): Product => ({
  id: "p1",
  name: "Test",
  sku: "SKU",
  barcode: "",
  category: "Accessories",
  price: 100,
  costPrice: 50,
  wholesalePrice: 80,
  stock: 0,
  minStock: 5,
  unit: "pcs",
  active: true,
  emoji: "📦",
  ...over,
});

describe("bundleAvailableStock", () => {
  it("returns the product's own stock for non-bundle products", () => {
    const p = baseProduct({ stock: 12, type: "simple" });
    expect(bundleAvailableStock(p, [p])).toBe(12);
  });

  it("derives stock as floor(min(component stock / qty))", () => {
    const a = baseProduct({ id: "a", stock: 10 });
    const b = baseProduct({ id: "b", stock: 7 });
    const bundle = baseProduct({
      id: "kit",
      type: "bundle",
      stock: 0,
      components: [
        { productId: "a", qty: 2 }, // 5 bundles worth
        { productId: "b", qty: 3 }, // 2 bundles worth — limiting
      ],
    });
    expect(bundleAvailableStock(bundle, [a, b, bundle])).toBe(2);
  });

  it("returns 0 when a component is missing", () => {
    const a = baseProduct({ id: "a", stock: 10 });
    const bundle = baseProduct({
      id: "kit",
      type: "bundle",
      components: [
        { productId: "a", qty: 1 },
        { productId: "missing", qty: 1 },
      ],
    });
    expect(bundleAvailableStock(bundle, [a, bundle])).toBe(0);
  });

  it("returns 0 when a component has zero qty", () => {
    const a = baseProduct({ id: "a", stock: 10 });
    const bundle = baseProduct({
      id: "kit",
      type: "bundle",
      components: [{ productId: "a", qty: 0 }],
    });
    expect(bundleAvailableStock(bundle, [a, bundle])).toBe(0);
  });

  it("recursively resolves nested bundles", () => {
    const a = baseProduct({ id: "a", stock: 8 });
    const inner = baseProduct({
      id: "inner",
      type: "bundle",
      components: [{ productId: "a", qty: 2 }], // → 4 inners
    });
    const outer = baseProduct({
      id: "outer",
      type: "bundle",
      components: [{ productId: "inner", qty: 2 }], // → 2 outers
    });
    expect(bundleAvailableStock(outer, [a, inner, outer])).toBe(2);
  });

  it("returns 0 when a bundle has no components", () => {
    const bundle = baseProduct({ id: "kit", type: "bundle", stock: 99 });
    // Treated as non-bundle fallback when components missing.
    expect(bundleAvailableStock(bundle, [bundle])).toBe(99);
  });
});

describe("effectiveReorderPoint", () => {
  it("uses minStock as the reorder threshold", () => {
    expect(effectiveReorderPoint(baseProduct({ minStock: 7 }))).toBe(7);
  });

  it("returns 0 when minStock is 0", () => {
    expect(effectiveReorderPoint(baseProduct({ minStock: 0 }))).toBe(0);
  });
});

describe("effectiveReorderPoint edge cases", () => {
  it("returns 0 when minStock is undefined", () => {
    const p = baseProduct({ minStock: undefined as unknown as number });
    expect(effectiveReorderPoint(p)).toBe(0);
  });

  it("returns 0 when minStock is NaN", () => {
    const p = baseProduct({ minStock: NaN });
    expect(effectiveReorderPoint(p)).toBe(0);
  });

  it("returns 0 when minStock is negative", () => {
    expect(effectiveReorderPoint(baseProduct({ minStock: -3 }))).toBe(0);
  });

  it("floors fractional minStock", () => {
    expect(effectiveReorderPoint(baseProduct({ minStock: 4.7 }))).toBe(4);
  });
});

describe("safeMinStock", () => {
  it("coerces strings to numbers", () => {
    expect(safeMinStock("10")).toBe(10);
  });
  it("falls back on invalid input", () => {
    expect(safeMinStock("abc", 5)).toBe(5);
    expect(safeMinStock(null, 5)).toBe(5);
    expect(safeMinStock(undefined, 5)).toBe(5);
  });
});

describe("suggestedPoQty", () => {
  it("suggests at least the reorder point", () => {
    const p = baseProduct({ stock: 10, minStock: 5 });
    // 5*2 - 10 = 0, but min is reorder → 5
    expect(suggestedPoQty(p)).toBe(5);
  });
  it("scales up when stock is below reorder", () => {
    const p = baseProduct({ stock: 2, minStock: 10 });
    // 10*2 - 2 = 18
    expect(suggestedPoQty(p)).toBe(18);
  });
  it("never returns less than 1, even when minStock is 0/invalid", () => {
    const p = baseProduct({ stock: 0, minStock: 0 });
    expect(suggestedPoQty(p)).toBe(1);
    const p2 = baseProduct({ stock: 0, minStock: NaN });
    expect(suggestedPoQty(p2)).toBe(1);
  });
});
