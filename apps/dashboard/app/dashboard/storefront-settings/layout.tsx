import { Settings, Globe, CreditCard, Image as ImageIcon } from "lucide-react";
import { StorefrontSettingsSidebar } from "./_components";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

export default function StorefrontSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storefront Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your website's configuration, banners, and links.
        </p>
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5 overflow-x-auto">
          <StorefrontSettingsSidebar />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
