import { describe, expect, it } from "vitest";
import { asyncify, ServiceError } from "@/shared/lib";

describe("asyncify", () => {
  it("resolves immediately when delay is 0", async () => {
    await expect(asyncify(42)).resolves.toBe(42);
  });

  it("resolves after delay", async () => {
    const start = Date.now();
    await asyncify("ok", 10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(9);
  });
});

describe("ServiceError", () => {
  it("carries message and code", () => {
    const err = new ServiceError("boom", "X");
    expect(err.message).toBe("boom");
    expect(err.code).toBe("X");
    expect(err.name).toBe("ServiceError");
  });
});
