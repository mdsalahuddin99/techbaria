/**
 * Settings service — reads/writes the `settings` JSON column on Shop.
 *
 * The JSON blob stores all tenant preferences (UI, receipt, invoice, loyalty,
 * payment methods, etc.) in a single column — no schema migration needed for
 * new settings keys.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { Prisma } from "@prisma/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import type { ShopSettings } from "@/features/settings/types";
import { cache, cacheKeys, TTL } from "@/lib/cache";

const DEFAULT_SHOP_SETTINGS: Partial<ShopSettings> = {
  tagline: "POS & Inventory",
  logoUrl: "",
  receiptFooter: "",
  loyaltyEnabled: false,
  loyaltyPointsPerCurrency: 1,
  loyaltyRedeemRate: 1,
  paymentMethodsEnabled: { Cash: true, Card: true, "Mobile Banking": true, Due: true, Wallet: true },
  defaultReceiptMode: "ask",
  hapticFeedback: true,
};

export const settingsService = {
  /** Get settings for the current shop. Returns defaults merged with stored values. */
  async get(ctx: Ctx): Promise<ShopSettings> {
    return cache.fetch(
      cacheKeys.shop.config("default"),
      TTL.SHOP_CONFIG,
      async () => {
        const shop = await prisma.shop.findFirst({
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            currency: true,
            settings: true,
          },
        });
        if (!shop) throw new ServiceError("NOT_FOUND", "Shop not found", 404);

        const stored = (shop.settings ?? {}) as Record<string, unknown>;

        return {
          shopName: shop.name,
          tagline: (stored.tagline as string) ?? DEFAULT_SHOP_SETTINGS.tagline,
          logoUrl: shop.logoUrl ?? DEFAULT_SHOP_SETTINGS.logoUrl,
          address: (stored.address as string) ?? "",
          phone: (stored.phone as string) ?? "",
          email: (stored.email as string) ?? "",
          website: stored.website as string | undefined,
          currencySymbol: shop.currency === "BDT" ? "৳" : (stored.currencySymbol as string) ?? "৳",
          receiptFooter: (stored.receiptFooter as string) ?? "",
          loyaltyEnabled: (stored.loyaltyEnabled as boolean) ?? false,
          loyaltyPointsPerCurrency: (stored.loyaltyPointsPerCurrency as number) ?? 1,
          loyaltyRedeemRate: (stored.loyaltyRedeemRate as number) ?? 1,
          paymentMethodsEnabled: {
            Cash: true,
            Card: true,
            "Mobile Banking": true,
            Due: true,
            Wallet: true,
            ...((stored.paymentMethodsEnabled as Record<string, boolean>) ?? {}),
          },
          invoiceReturnPolicy: stored.invoiceReturnPolicy as string | undefined,
          invoiceWarrantyNote: stored.invoiceWarrantyNote as string | undefined,
          invoiceShowComputerGenerated: stored.invoiceShowComputerGenerated as boolean | undefined,
          invoiceTitleLabel: stored.invoiceTitleLabel as string | undefined,
          invoiceHeaderRightLogoUrl: stored.invoiceHeaderRightLogoUrl as string | undefined,
          invoiceFooterText: stored.invoiceFooterText as string | undefined,
          invoiceFooterBrandLogos: stored.invoiceFooterBrandLogos as string[] | undefined,
          invoiceNumberPrefix: (stored.invoiceNumberPrefix as string) ?? "STAN",
          invoiceNumberStartSeq: (stored.invoiceNumberStartSeq as number) ?? 500,
          defaultReceiptMode: (stored.defaultReceiptMode as "ask" | "thermal" | "invoice") ?? "ask",
          hapticFeedback: (stored.hapticFeedback as boolean) ?? true,
        };
      },
    );
  },

  /** Update settings for the current shop. */
  async update(ctx: Ctx, input: Partial<ShopSettings>): Promise<ShopSettings> {
    // Fetch the single shop record to get its ID
    const shop = await prisma.shop.findFirst({ select: { id: true } });
    if (!shop) throw new ServiceError("NOT_FOUND", "Shop not found", 404);

    // Build the JSON to store: everything except shopName/logoUrl goes into settings column
    const settingsUpdate: Record<string, unknown> = {};

    // Fields that live in the settings JSON column
    const settingsKeys: (keyof ShopSettings)[] = [
      "tagline", "address", "phone", "email", "website",
      "currencySymbol", "receiptFooter", "loyaltyEnabled",
      "loyaltyPointsPerCurrency", "loyaltyRedeemRate",
      "paymentMethodsEnabled", "invoiceReturnPolicy",
      "invoiceWarrantyNote", "invoiceShowComputerGenerated",
      "invoiceTitleLabel", "invoiceHeaderRightLogoUrl",
      "invoiceFooterText", "invoiceFooterBrandLogos",
      "invoiceNumberPrefix", "invoiceNumberStartSeq",
      "defaultReceiptMode", "hapticFeedback",
    ];

    for (const key of settingsKeys) {
      if (key in input) {
        settingsUpdate[key] = input[key as keyof ShopSettings];
      }
    }

    // Update the shop record
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        // shopName and logoUrl live on the Shop table directly
        ...(input.shopName !== undefined && { name: input.shopName }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        // Everything else goes into the JSON settings column
        ...(Object.keys(settingsUpdate).length > 0 && {
          settings: settingsUpdate as Prisma.InputJsonValue,
        }),
      },
    });

    // Invalidate cache so next read is fresh
    await cache.invalidateShopConfig("default");

    // Return the merged result
    return this.get(ctx);
  },
};
