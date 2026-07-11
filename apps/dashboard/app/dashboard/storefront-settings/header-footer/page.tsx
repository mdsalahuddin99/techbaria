import { getSiteConfig } from "@/features/storefront/actions/config.actions";
import { SocialSettingsForm } from "../_components/SocialSettingsForm";
import { FooterSettingsForm } from "../_components/FooterSettingsForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";

export default async function HeaderFooterSettingsPage() {
  const socialLinks = (await getSiteConfig("social")) || {};
  const footerData = (await getSiteConfig("footer")) || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Configure the social links displayed in the footer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SocialSettingsForm initialData={socialLinks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Settings</CardTitle>
          <CardDescription>
            Configure the dynamic links and about text for the storefront footer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FooterSettingsForm initialData={footerData} />
        </CardContent>
      </Card>
    </div>
  );
}
