import { z } from "zod";

export const shiftOpenSchema = z.object({
  openingBalance: z.number().min(0, "Opening balance must be ≥ 0"),
});

export const shiftCloseSchema = z.object({
  closingCount: z.number().min(0, "Closing count must be ≥ 0"),
});
