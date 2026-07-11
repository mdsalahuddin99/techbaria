import { getSiteConfig } from "@/features/storefront/actions/config.actions";
import { CheckoutSettingsForm } from "../_components/CheckoutSettingsForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";

export default async function CheckoutSettingsPage() {
  const checkoutSettings = (await getSiteConfig("checkout")) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout Settings</CardTitle>
        <CardDescription>
          Configure options related to the checkout process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CheckoutSettingsForm initialData={checkoutSettings} />
      </CardContent>
    </Card>
  );
}
