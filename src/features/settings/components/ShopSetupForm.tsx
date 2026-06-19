import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import ImageUpload from "@/components/ImageUpload";
import { useToast } from "@/shared/hooks/use-toast";
import { useSettings, useUpdateSettings } from "@/features/settings/hooks";

interface ShopSetupFormProps {
  onComplete?: () => void;
  submitLabel?: string;
}

/**
 * Reusable shop-onboarding form. Drives the per-tenant ShopSettings
 * record. Used both on the post-payment Shop Setup wizard and as a
 * standalone "Edit shop info" panel inside Settings.
 */
export function ShopSetupForm({
  onComplete,
  submitLabel = "Save & continue",
}: ShopSetupFormProps) {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [shopName, setShopName] = useState(settings.shopName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl ?? "");
  const [phone, setPhone] = useState(settings.phone);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!shopName.trim()) next.shopName = "Shop name is required.";
    if (!phone.trim()) next.phone = "Phone is required.";
    if (!currencySymbol.trim()) next.currencySymbol = "Currency symbol is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateSettings.mutateAsync({
        shopName: shopName.trim(),
        logoUrl,
        phone: phone.trim(),
        currencySymbol: currencySymbol.trim(),
      });
      toast({ title: "Shop info saved" });
      onComplete?.();
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label>Shop logo</Label>
        <ImageUpload
          value={logoUrl || undefined}
          onChange={(url) => setLogoUrl(url ?? "")}
          fallbackEmoji="🏪"
          size="lg"
          allowDataUrlFallback
        />
        <p className="text-xs text-muted-foreground">
          Shown on the sidebar, invoices and receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shopName">Shop name *</Label>
          <Input
            id="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            disabled={submitting}
          />
          {errors.shopName ? (
            <p className="text-xs text-destructive">{errors.shopName}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            placeholder="01XXXXXXXXX"
          />
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency symbol *</Label>
        <Input
          id="currency"
          value={currencySymbol}
          onChange={(e) => setCurrencySymbol(e.target.value)}
          disabled={submitting}
          className="w-32"
        />
        {errors.currencySymbol ? (
          <p className="text-xs text-destructive">{errors.currencySymbol}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {submitLabel}
      </Button>
    </form>
  );
}
