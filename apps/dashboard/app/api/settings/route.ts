export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { settingsService } from "@/server/services/settingsService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx) => {
  return settingsService.get(ctx);
}, "settings:get");

export const PUT = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, zSettingsInput);
  return settingsService.update(ctx, body);
}, "settings:update");

// Lazy import to avoid pulling Zod into the server bundle at module level
import { z } from "zod";

const zSettingsInput = z.object({
  shopName: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().max(120).optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  currencySymbol: z.string().optional(),
  receiptFooter: z.string().optional(),
  loyaltyEnabled: z.boolean().optional(),
  loyaltyPointsPerCurrency: z.number().nonnegative().optional(),
  loyaltyRedeemRate: z.number().nonnegative().optional(),
  paymentMethodsEnabled: z.record(z.boolean()).optional(),
  invoiceReturnPolicy: z.string().optional(),
  invoiceWarrantyNote: z.string().optional(),
  invoiceShowComputerGenerated: z.boolean().optional(),
  invoiceTitleLabel: z.string().optional(),
  invoiceHeaderRightLogoUrl: z.string().optional(),
  invoiceFooterText: z.string().optional(),
  invoiceFooterBrandLogos: z.array(z.string()).optional(),
  defaultReceiptMode: z.enum(["ask", "thermal", "invoice"]).optional(),
  hapticFeedback: z.boolean().optional(),
});
