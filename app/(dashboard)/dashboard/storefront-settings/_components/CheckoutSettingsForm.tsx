"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { updateSiteConfig } from "@/features/storefront/actions/config.actions";

export function CheckoutSettingsForm({ initialData = {} }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    requireEmail: initialData?.requireEmail ?? true,
    requirePhone: initialData?.requirePhone ?? true,
    requireAddress: initialData?.requireAddress ?? true,
    showOrderNotes: initialData?.showOrderNotes ?? true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateSiteConfig("checkout", data);
    setLoading(false);
    if (res.success) {
      toast.success("Checkout settings updated!");
    } else {
      toast.error("Failed to update settings");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Email Address</Label>
          <div className="text-sm text-muted-foreground">Is email mandatory for checkout?</div>
        </div>
        <Switch 
          checked={data.requireEmail} 
          onCheckedChange={(checked) => setData({ ...data, requireEmail: checked })} 
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Phone Number</Label>
          <div className="text-sm text-muted-foreground">Is phone number mandatory for checkout?</div>
        </div>
        <Switch 
          checked={data.requirePhone} 
          onCheckedChange={(checked) => setData({ ...data, requirePhone: checked })} 
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Full Address</Label>
          <div className="text-sm text-muted-foreground">Is address mandatory for checkout?</div>
        </div>
        <Switch 
          checked={data.requireAddress} 
          onCheckedChange={(checked) => setData({ ...data, requireAddress: checked })} 
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Show Order Notes</Label>
          <div className="text-sm text-muted-foreground">Allow customers to leave a note on checkout</div>
        </div>
        <Switch 
          checked={data.showOrderNotes} 
          onCheckedChange={(checked) => setData({ ...data, showOrderNotes: checked })} 
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Checkout Settings"}
      </Button>
    </form>
  );
}
