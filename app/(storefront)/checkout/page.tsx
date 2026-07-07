import { getSiteConfig } from "@/features/storefront/actions/config.actions";
import { CheckoutClient } from "@/features/storefront/components/checkout/CheckoutClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout — AmarShop",
};

export default async function StorefrontCheckoutPage() {
  const checkoutConfig = await getSiteConfig("checkout");

  return <CheckoutClient config={checkoutConfig} />;
}
