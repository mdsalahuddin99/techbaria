"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { updateSiteConfig } from "@/features/storefront/actions/config.actions";

export interface ShippingMethodConfig {
  id: string;
  title: string;
  sub: string;
  price: number;
}

const DEFAULT_SHIPPING: ShippingMethodConfig[] = [
  { id: "inside_dhaka", title: "Inside Dhaka", sub: "Delivery within 24 hours", price: 70 },
  { id: "outside_dhaka", title: "Outside Dhaka", sub: "2-3 business days", price: 130 },
  { id: "pickup", title: "Store Pickup", sub: "Pick up from our Dhaka store", price: 0 },
];

export function CheckoutSettingsForm({ initialData = {} }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    requireEmail: initialData?.requireEmail ?? true,
    requirePhone: initialData?.requirePhone ?? true,
    requireAddress: initialData?.requireAddress ?? true,
    showOrderNotes: initialData?.showOrderNotes ?? true,
    shippingMethods: (initialData?.shippingMethods?.length ? initialData.shippingMethods : DEFAULT_SHIPPING) as ShippingMethodConfig[],
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

  const addShippingMethod = () => {
    const id = `shipping_${Date.now()}`;
    setData({
      ...data,
      shippingMethods: [...data.shippingMethods, { id, title: "New Method", sub: "", price: 0 }],
    });
  };

  const updateShippingMethod = (index: number, key: keyof ShippingMethodConfig, value: string | number) => {
    const methods = [...data.shippingMethods];
    methods[index] = { ...methods[index], [key]: value };
    setData({ ...data, shippingMethods: methods });
  };

  const removeShippingMethod = (index: number) => {
    const methods = data.shippingMethods.filter((_, i) => i !== index);
    setData({ ...data, shippingMethods: methods });
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
      <div className="space-y-6">
        <h3 className="text-lg font-medium">General Requirements</h3>
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
      </div>

      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Shipping Methods</h3>
          <Button type="button" variant="outline" size="sm" onClick={addShippingMethod}>
            <Plus className="h-4 w-4 mr-2" />
            Add Method
          </Button>
        </div>
        
        <div className="space-y-3">
          {data.shippingMethods.map((method, index) => (
            <div key={method.id} className="flex items-start gap-4 p-4 border rounded-xl bg-card">
              <div className="pt-2 cursor-move text-muted-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID (internal)</Label>
                  <Input 
                    value={method.id} 
                    onChange={(e) => updateShippingMethod(index, "id", e.target.value)} 
                    placeholder="e.g. inside_dhaka" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title (displayed)</Label>
                  <Input 
                    value={method.title} 
                    onChange={(e) => updateShippingMethod(index, "title", e.target.value)} 
                    placeholder="Inside Dhaka" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (optional)</Label>
                  <Input 
                    value={method.sub} 
                    onChange={(e) => updateShippingMethod(index, "sub", e.target.value)} 
                    placeholder="Delivery within 24 hours" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (৳)</Label>
                  <Input 
                    type="number"
                    value={method.price} 
                    onChange={(e) => updateShippingMethod(index, "price", Number(e.target.value))} 
                  />
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                onClick={() => removeShippingMethod(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.shippingMethods.length === 0 && (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm">
              No shipping methods configured. Add one above.
            </div>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading} size="lg">
        {loading ? "Saving..." : "Save Checkout Settings"}
      </Button>
    </form>
  );
}
