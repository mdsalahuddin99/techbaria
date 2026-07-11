import type { PaymentMethod } from "@/features/sales/types";

export interface ShopSettings {
  shopName: string;
  tagline?: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  currencySymbol: string;
  receiptFooter: string;
  loyaltyEnabled: boolean;
  /** points per 100 BDT */
  loyaltyPointsPerCurrency: number;
  /** BDT per 1 point */
  loyaltyRedeemRate: number;
  paymentMethodsEnabled: Record<PaymentMethod, boolean>;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  defaultReceiptMode?: "ask" | "thermal" | "invoice";
  /** Enable haptic feedback (vibration) when adding products on mobile. */
  hapticFeedback?: boolean;
  /** Invoice template — printable A4 invoice customisation. */
  invoiceReturnPolicy?: string;
  invoiceWarrantyNote?: string;
  invoiceShowComputerGenerated?: boolean;
  invoiceTitleLabel?: string;
  /** Right-side header logo (e.g. brand wordmark) on printed invoice. */
  invoiceHeaderRightLogoUrl?: string;
  /** Full-width header banner image (replaces default text header if provided). */
  invoiceFullHeaderUrl?: string;
  /** Custom footer text shown above brand logos / computer-generated line. */
  invoiceFooterText?: string;
  /** Full-width footer banner image (replaces default footer section if provided). */
  invoiceFullFooterUrl?: string;
  /** Brand/partner logos shown as a strip at the bottom of the invoice. */
  invoiceFooterBrandLogos?: string[];
  /** Invoice numbering configuration */
  invoiceNumberPrefix?: string;
  invoiceNumberStartSeq?: number;
}

