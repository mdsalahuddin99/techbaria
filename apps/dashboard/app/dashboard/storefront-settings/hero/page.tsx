import { HeroSettingsClient } from "./HeroSettingsClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";

export default function HeroSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Settings</CardTitle>
        <CardDescription>
          Manage the hero slides displayed on the storefront home page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HeroSettingsClient />
      </CardContent>
    </Card>
  );
}
