"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "sonner";
import { updateSiteConfig } from "@/features/storefront/actions/config.actions";
import { Plus, Trash2 } from "lucide-react";

export function FooterSettingsForm({ initialData = {} }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    aboutText: initialData?.aboutText || "",
    shopLinks: initialData?.shopLinks || [
      { label: "All Products", url: "/shop" },
    ],
    helpLinks: initialData?.helpLinks || [
      { label: "Track Order", url: "/track" },
    ],
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateSiteConfig("footer", data);
    setLoading(false);
    if (res.success) {
      toast.success("Footer settings updated!");
    } else {
      toast.error("Failed to update settings");
    }
  };

  const addLink = (type: "shopLinks" | "helpLinks") => {
    setData({
      ...data,
      [type]: [...data[type], { label: "", url: "" }],
    });
  };

  const updateLink = (type: "shopLinks" | "helpLinks", index: number, field: "label" | "url", value: string) => {
    const newLinks = [...data[type]];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setData({ ...data, [type]: newLinks });
  };

  const removeLink = (type: "shopLinks" | "helpLinks", index: number) => {
    const newLinks = [...data[type]];
    newLinks.splice(index, 1);
    setData({ ...data, [type]: newLinks });
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
      <div className="space-y-2">
        <Label>Footer About Text</Label>
        <Textarea 
          value={data.aboutText} 
          onChange={(e) => setData({ ...data, aboutText: e.target.value })} 
          placeholder="e.g. Original branded mobile, laptop, CCTV..."
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Shop Links</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => addLink("shopLinks")}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Link
          </Button>
        </div>
        {data.shopLinks.map((link: any, i: number) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="flex-1 space-y-1">
              <Input 
                placeholder="Label (e.g. Mobile)" 
                value={link.label}
                onChange={(e) => updateLink("shopLinks", i, "label", e.target.value)}
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <Input 
                placeholder="URL (e.g. /shop/Mobile)" 
                value={link.url}
                onChange={(e) => updateLink("shopLinks", i, "url", e.target.value)}
                required
              />
            </div>
            <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeLink("shopLinks", i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {data.shopLinks.length === 0 && <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">No shop links added.</div>}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Help & Support Links</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => addLink("helpLinks")}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Link
          </Button>
        </div>
        {data.helpLinks.map((link: any, i: number) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="flex-1 space-y-1">
              <Input 
                placeholder="Label (e.g. Privacy Policy)" 
                value={link.label}
                onChange={(e) => updateLink("helpLinks", i, "label", e.target.value)}
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <Input 
                placeholder="URL (e.g. /privacy)" 
                value={link.url}
                onChange={(e) => updateLink("helpLinks", i, "url", e.target.value)}
                required
              />
            </div>
            <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeLink("helpLinks", i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {data.helpLinks.length === 0 && <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">No help links added.</div>}
      </div>

      <Button type="submit" disabled={loading} size="lg">
        {loading ? "Saving..." : "Save Footer Settings"}
      </Button>
    </form>
  );
}
