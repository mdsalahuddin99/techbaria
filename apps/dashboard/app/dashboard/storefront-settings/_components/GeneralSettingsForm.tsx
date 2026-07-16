"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { updateSiteConfig } from "@/features/storefront/actions/config.actions";
import ImageUpload from "@/components/ImageUpload";

export function GeneralSettingsForm({ initialData = {} }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    storeName: initialData?.storeName || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    logoUrl: initialData?.logoUrl || "",
    whatsappNumber: initialData?.whatsappNumber || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateSiteConfig("general", data);
    setLoading(false);
    if (res.success) {
      toast.success("General settings updated!");
    } else {
      toast.error("Failed to update settings");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label>Store Logo</Label>
        <ImageUpload
          value={data.logoUrl}
          onChange={(url) => setData({ ...data, logoUrl: url || "" })}
          allowDataUrlFallback
        />
      </div>
      <div className="space-y-2">
        <Label>Store Name</Label>
        <Input 
          value={data.storeName} 
          onChange={(e) => setData({ ...data, storeName: e.target.value })} 
          placeholder="e.g. AmarShop" 
        />
      </div>
      <div className="space-y-2">
        <Label>Support Phone Number</Label>
        <Input 
          value={data.phone} 
          onChange={(e) => setData({ ...data, phone: e.target.value })} 
          placeholder="e.g. +880 1700-000000" 
        />
      </div>
      <div className="space-y-2">
        <Label>WhatsApp Number</Label>
        <Input 
          value={data.whatsappNumber} 
          onChange={(e) => setData({ ...data, whatsappNumber: e.target.value })} 
          placeholder="e.g. 8801700000000" 
        />
      </div>
      <div className="space-y-2">
        <Label>Support Email</Label>
        <Input 
          type="email"
          value={data.email} 
          onChange={(e) => setData({ ...data, email: e.target.value })} 
          placeholder="e.g. support@amarshop.com" 
        />
      </div>
      <div className="space-y-2">
        <Label>Store Address</Label>
        <Input 
          value={data.address} 
          onChange={(e) => setData({ ...data, address: e.target.value })} 
          placeholder="e.g. Dhaka, Bangladesh" 
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save General Settings"}
      </Button>
    </form>
  );
}
