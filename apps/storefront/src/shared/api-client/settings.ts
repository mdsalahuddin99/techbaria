/**
 * Typed fetch wrapper for the settings API.
 */
import { apiFetch } from "./fetch";
import type { ShopSettings } from "@/features/settings/types";

const BASE = "/api/settings";

export const settingsApi = {
  /** Get shop settings (merged defaults + DB). */
  get(): Promise<ShopSettings> {
    return apiFetch<ShopSettings>(BASE);
  },

  /** Update shop settings (partial update). */
  update(input: Partial<ShopSettings>): Promise<ShopSettings> {
    return apiFetch<ShopSettings>(BASE, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
};
