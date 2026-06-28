import { getSiteConfig } from "@/features/storefront/actions/config.actions";
import { GeneralSettingsForm } from "../_components/GeneralSettingsForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";

export default async function GeneralSettingsPage() {
  const generalSettings = (await getSiteConfig("general")) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Configure the general information for your storefront.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GeneralSettingsForm initialData={generalSettings} />
      </CardContent>
    </Card>
  );
}
