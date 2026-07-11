"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { updateSiteConfig } from "@/features/storefront/actions/config.actions";

export function SocialSettingsForm({ initialData = {} }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    facebook: initialData?.facebook || "",
    instagram: initialData?.instagram || "",
    twitter: initialData?.twitter || "",
    youtube: initialData?.youtube || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateSiteConfig("social", data);
    setLoading(false);
    if (res.success) {
      toast.success("Social settings updated!");
    } else {
      toast.error("Failed to update settings");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label>Facebook URL</Label>
        <Input 
          value={data.facebook} 
          onChange={(e) => setData({ ...data, facebook: e.target.value })} 
          placeholder="https://facebook.com/..." 
        />
      </div>
      <div className="space-y-2">
        <Label>Instagram URL</Label>
        <Input 
          value={data.instagram} 
          onChange={(e) => setData({ ...data, instagram: e.target.value })} 
          placeholder="https://instagram.com/..." 
        />
      </div>
      <div className="space-y-2">
        <Label>Twitter URL</Label>
        <Input 
          value={data.twitter} 
          onChange={(e) => setData({ ...data, twitter: e.target.value })} 
          placeholder="https://twitter.com/..." 
        />
      </div>
      <div className="space-y-2">
        <Label>YouTube URL</Label>
        <Input 
          value={data.youtube} 
          onChange={(e) => setData({ ...data, youtube: e.target.value })} 
          placeholder="https://youtube.com/..." 
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Social Links"}
      </Button>
    </form>
  );
}
