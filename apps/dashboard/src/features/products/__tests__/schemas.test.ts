import { describe, it, expect } from "vitest";
import { productSchema, stripLegacyReorderFields, LEGACY_REORDER_FIELDS } from "@/features/products/schemas";

describe("stripLegacyReorderFields", () => {
  it("removes reorderPoint / reorderQty / preferredSupplierId", () => {
    const input = {
      name: "X",
      sku: "S",
      minStock: 5,
      reorderPoint: 7,
      reorderQty: 12,
      preferredSupplierId: "sup1",
    } as unknown as Record<string, unknown>;
    const out = stripLegacyReorderFields(input);
    for (const k of LEGACY_REORDER_FIELDS) expect(out).not.toHaveProperty(k);
    expect(out.minStock).toBe(5);
  });
});

describe("productSchema legacy guard", () => {
  it("rejects payloads carrying legacy reorder fields", () => {
    const result = productSchema.safeParse({
      name: "Cable",
      sku: "C1",
      category: "Accessories",
      minStock: 5,
      reorderPoint: 10, // should fail under .strict()
    });
    expect(result.success).toBe(false);
  });

  it("normalises invalid minStock to default", () => {
    const r = productSchema.safeParse({
      name: "Cable",
      sku: "C1",
      category: "Accessories",
      minStock: "" as unknown as number,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.minStock).toBe(5);
  });
});
