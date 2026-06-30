"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Settings as SettingsIcon, Save, RefreshCw, Download, Upload, Store, Receipt, Award, FileSpreadsheet, Languages, Building2, Trash2, FileText, Users } from "lucide-react";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "sonner";
import { PaymentMethod } from "@/shared/lib/types";
import { downloadCsv } from "@/shared/lib/csv";
import ImageUpload from "@/components/ImageUpload";
import { PageHeader } from "@/shared/components";
import { useT, LANGS, useLanguageStore } from "@/features/i18n";
import StaffTab from "@/features/settings/components/StaffTab";
import WarehousesTab from "@/features/settings/components/WarehousesTab";
import { FEATURES } from "@/config/featureFlags";
import { wipeAllCloudData, exportFullJson } from "@/services/backupService";
import { productsApi } from "@/shared/api-client/products";
import { customersApi } from "@/shared/api-client/customers";
import { salesApi } from "@/shared/api-client/sales";
import { purchasesApi } from "@/shared/api-client/purchases";
import { suppliersApi } from "@/shared/api-client/suppliers";
import { listCategories } from "@/shared/api-client/categories";
import type { ShopSettings } from "@/features/settings/types";
import { useSettingsForm } from "@/features/settings/hooks";

export function SettingsClient() {
  usePageTitle("Settings");
  const { form, setForm, save, saving, loaded } = useSettingsForm();
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);

  const togglePayment = (m: PaymentMethod, on: boolean) => {
    setForm({
      ...form,
      paymentMethodsEnabled: { ...form.paymentMethodsEnabled, [m]: on },
    });
  };

  const wipeCloudDatabase = async () => {
    setWiping(true);
    try {
      await wipeAllCloudData();
      try { localStorage.removeItem("shopflow-pos-ui-v1"); localStorage.removeItem("shopflow-settings"); } catch (e) { console.warn(e); }
      toast.success("Database সম্পূর্ণ ক্লিয়ার হয়েছে");
      setWipeOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Database clear করতে সমস্যা হয়েছে";
      toast.error(msg);
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      {/* Language switcher */}
      <Card className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center shrink-0">
            <Languages className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-tight">{t("settings.language.title")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.language.description")}</p>
          </div>
        </div>
        <div className="flex rounded-md border bg-background p-0.5 shrink-0">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={
                "px-3 h-8 text-sm rounded-[5px] transition-colors " +
                (l.code === lang
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-accent")
              }
            >
              {l.native}
            </button>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="shop">
        <div className="-mx-3 sm:mx-0 overflow-x-auto no-scrollbar">
          <TabsList className="w-max">
            <TabsTrigger value="shop"><Store className="h-3.5 w-3.5 mr-1" />{t("settings.tab.shop")}</TabsTrigger>

            <TabsTrigger value="staff"><Users className="h-3.5 w-3.5 mr-1" />Staff</TabsTrigger>
            <TabsTrigger value="receipt"><Receipt className="h-3.5 w-3.5 mr-1" />{t("settings.tab.receipt")}</TabsTrigger>
            <TabsTrigger value="invoice"><FileText className="h-3.5 w-3.5 mr-1" />Invoice Template</TabsTrigger>
            <TabsTrigger value="payments"><SettingsIcon className="h-3.5 w-3.5 mr-1" />{t("settings.tab.payments")}</TabsTrigger>
            <TabsTrigger value="loyalty"><Award className="h-3.5 w-3.5 mr-1" />{t("settings.tab.loyalty")}</TabsTrigger>
            <TabsTrigger value="warehouses"><Building2 className="h-3.5 w-3.5 mr-1" />Warehouses</TabsTrigger>
            <TabsTrigger value="data"><RefreshCw className="h-3.5 w-3.5 mr-1" />{t("settings.tab.data")}</TabsTrigger>
          </TabsList>
        </div>

        {/* Shop info */}
        <TabsContent value="shop" className="mt-4">
          <Card className="p-6 space-y-4">
            <Field label="Shop Logo">
              <ImageUpload
                value={form.logoUrl || undefined}
                onChange={(url) => setForm({ ...form, logoUrl: url ?? "" })}
                fallbackEmoji="🏪"
                size="lg"
                allowDataUrlFallback
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Shown on the sidebar, invoices and printed receipts. Square images work best.
              </p>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Shop Name">
                <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
              </Field>
              <Field label="Tagline">
                <Input
                  value={form.tagline ?? ""}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. POS & Inventory"
                />
              </Field>
            </div>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Website">
                <Input
                  value={form.website ?? ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
            </div>
            <Field label="Currency Symbol">
              <Input value={form.currencySymbol} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} className="w-32" />
            </Field>
            <LoadingButton onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90" loading={saving}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </LoadingButton>
          </Card>
        </TabsContent>



        {/* Staff */}
        <TabsContent value="staff" className="mt-4">
          <StaffTab />
        </TabsContent>

        {/* Warehouses */}
        <TabsContent value="warehouses" className="mt-4">
          <WarehousesTab />
        </TabsContent>

        {/* Receipt */}
        <TabsContent value="receipt" className="mt-4">
          <Card className="p-6 space-y-4">
            <Field label="Receipt Footer">
              <Input value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} />
            </Field>
            <Field label="Default Receipt Format">
              <select
                value={form.defaultReceiptMode ?? "ask"}
                onChange={(e) => setForm({ ...form, defaultReceiptMode: e.target.value as "ask" | "thermal" | "invoice" })}
                className="h-10 px-3 rounded-md border bg-background text-sm w-full md:w-64"
              >
                <option value="ask">Ask every time</option>
                <option value="thermal">Thermal Receipt (80mm)</option>
                <option value="invoice">Full Invoice (A4)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Choose what shows after each checkout.</p>
            </Field>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Haptic Feedback</p>
                <p className="text-xs text-muted-foreground">Vibrate briefly when a product is added on mobile.</p>
              </div>
              <Switch
                checked={form.hapticFeedback ?? true}
                onCheckedChange={(c) => setForm({ ...form, hapticFeedback: c })}
              />
            </div>
            <LoadingButton onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90" loading={saving}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </LoadingButton>
          </Card>
        </TabsContent>

        {/* Invoice Template */}
        <TabsContent value="invoice" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Printable A4 Invoice</h3>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Customise the text that appears on your printed sales invoice.
            </p>
            <Field label="Invoice Title Label">
              <Input
                value={form.invoiceTitleLabel ?? ""}
                onChange={(e) => setForm({ ...form, invoiceTitleLabel: e.target.value })}
                placeholder="Sales Invoice"
                className="w-full md:w-64"
              />
              <p className="text-xs text-muted-foreground mt-1">Shown inside the boxed pill at the top of the invoice.</p>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Invoice Number Prefix">
                <Input
                  value={form.invoiceNumberPrefix ?? ""}
                  onChange={(e) => setForm({ ...form, invoiceNumberPrefix: e.target.value })}
                  placeholder="e.g. STAN"
                />
                <p className="text-xs text-muted-foreground mt-1">Starting prefix of custom invoice numbers.</p>
              </Field>
              <Field label="Invoice Start Sequence">
                <Input
                  type="number"
                  value={form.invoiceNumberStartSeq ?? ""}
                  onChange={(e) => setForm({ ...form, invoiceNumberStartSeq: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 500"
                />
                <p className="text-xs text-muted-foreground mt-1">The base starting number for numbering sequences.</p>
              </Field>
            </div>
            <Field label="Return &amp; Refund Policy">
              <Textarea
                rows={5}
                value={form.invoiceReturnPolicy ?? "-No Return After Sales.\n-Product Exchange Applies Only To Products.\n-No Money Will Refund.\n-Please Check Your Products Before Leave."}
                onChange={(e) => setForm({ ...form, invoiceReturnPolicy: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">One bullet per line. Appears in the bottom-left of every invoice.</p>
            </Field>
            <Field label="Warranty Void Note">
              <Input
                value={form.invoiceWarrantyNote ?? ""}
                onChange={(e) => setForm({ ...form, invoiceWarrantyNote: e.target.value })}
                placeholder="Warranty Void - Sticker Removed Items, Burned Case and Physically Damaged Goods"
              />
            </Field>



            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm">Header</h4>
              <Field label="Full Header Banner (Optional)">
                <ImageUpload
                  value={form.invoiceFullHeaderUrl || undefined}
                  onChange={(url) => setForm({ ...form, invoiceFullHeaderUrl: url ?? "" })}
                  fallbackEmoji="🖼️"
                  size="lg"
                  allowDataUrlFallback
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  If uploaded, this banner will replace the default shop name, address, and logo at the top of the invoice.
                </p>
              </Field>
              <div className="pt-2">
                <Field label="Header Right-side Logo">
                <ImageUpload
                  value={form.invoiceHeaderRightLogoUrl || undefined}
                  onChange={(url) => setForm({ ...form, invoiceHeaderRightLogoUrl: url ?? "" })}
                  fallbackEmoji="🏷️"
                  size="md"
                  allowDataUrlFallback
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Optional brand wordmark/logo shown on the top-right of every printed invoice (ignored if Full Header Banner is used).
                </p>
              </Field>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm">Footer</h4>
              <Field label="Full Footer Banner (Optional)">
                <ImageUpload
                  value={form.invoiceFullFooterUrl || undefined}
                  onChange={(url) => setForm({ ...form, invoiceFullFooterUrl: url ?? "" })}
                  fallbackEmoji="🖼️"
                  size="lg"
                  allowDataUrlFallback
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  If uploaded, this banner will replace the default brand logos and footer text at the bottom.
                </p>
              </Field>
              <div className="pt-2">
                <Field label="Footer Text">
                <Input
                  value={form.invoiceFooterText ?? ""}
                  onChange={(e) => setForm({ ...form, invoiceFooterText: e.target.value })}
                  placeholder="Thanks for your business"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown under the brand logo strip.</p>
              </Field>
              <Field label="Footer Brand Logos">
                <div className="space-y-2">
                  {(form.invoiceFooterBrandLogos ?? []).map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <ImageUpload
                        value={url || undefined}
                        onChange={(next) => {
                          const list = [...(form.invoiceFooterBrandLogos ?? [])];
                          if (next) list[idx] = next;
                          else list.splice(idx, 1);
                          setForm({ ...form, invoiceFooterBrandLogos: list });
                        }}
                        fallbackEmoji="🏢"
                        size="sm"
                        allowDataUrlFallback
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        invoiceFooterBrandLogos: [...(form.invoiceFooterBrandLogos ?? []), ""],
                      })
                    }
                  >
                    + Add Brand Logo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Partner/brand logos (e.g. Hikvision, IMOU, TP-Link). Shown as a strip at the bottom.
                </p>
              </Field>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Show "Computer Generated Bill" line</p>
                <p className="text-xs text-muted-foreground">Disable if you sign invoices manually.</p>
              </div>
              <Switch
                checked={form.invoiceShowComputerGenerated !== false}
                onCheckedChange={(c) => setForm({ ...form, invoiceShowComputerGenerated: c })}
              />
            </div>
            <LoadingButton onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90" loading={saving}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </LoadingButton>
          </Card>
        </TabsContent>


        {/* Payment methods */}
        <TabsContent value="payments" className="mt-4">
          <Card className="p-6 space-y-3">
            {(["Cash", "Card", "Mobile Banking"] as PaymentMethod[]).map((m) => (
              <div key={m} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{m}</p>
                  <p className="text-xs text-muted-foreground">
                    {m === "Mobile Banking" ? "bKash, Nagad, Rocket etc." : `Accept ${m.toLowerCase()} payments`}
                  </p>
                </div>
                <Switch
                  checked={form.paymentMethodsEnabled[m]}
                  onCheckedChange={(c) => togglePayment(m, c)}
                />
              </div>
            ))}
            <LoadingButton onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90" loading={saving}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </LoadingButton>
          </Card>
        </TabsContent>

        {/* Loyalty */}
        <TabsContent value="loyalty" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Loyalty Program</p>
                <p className="text-xs text-muted-foreground">Earn points on every purchase.</p>
              </div>
              <Switch
                checked={form.loyaltyEnabled}
                onCheckedChange={(c) => setForm({ ...form, loyaltyEnabled: c })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Points per ৳100">
                <Input
                  type="number"
                  value={form.loyaltyPointsPerCurrency}
                  onChange={(e) => setForm({ ...form, loyaltyPointsPerCurrency: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Redeem rate (৳ per point)">
                <Input
                  type="number"
                  value={form.loyaltyRedeemRate}
                  onChange={(e) => setForm({ ...form, loyaltyRedeemRate: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <LoadingButton onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90" loading={saving}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </LoadingButton>
          </Card>
        </TabsContent>

        {/* Data */}
        <TabsContent value="data" className="mt-4 space-y-4">
          {/* Full JSON Export */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 p-3 border rounded-md">
              <div>
                <p className="font-medium">📦 Full JSON Export</p>
                <p className="text-xs text-muted-foreground">
                  সব ডাটা (products, sales, purchases, customers, ইত্যাদি) একটি JSON file-এ download করুন।
                </p>
              </div>
              <Button variant="outline" onClick={async () => { try { await exportFullJson(); toast.success("JSON exported!"); } catch (e) { toast.error("Export failed"); console.error(e); } }}>
                <Download className="h-4 w-4 mr-2" />Export JSON
              </Button>
            </div>
          </Card>

          {/* CSV Exports */}
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">CSV Exports</h3>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Excel বা Google Sheets-এ খোলার জন্য CSV download করুন।
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={async () => { const d = await productsApi.list(); downloadCsv(d.items, "products.csv"); }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Products
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { const d = await customersApi.list(); downloadCsv(d.items, "customers.csv"); }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Customers
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { const d = await suppliersApi.list(); downloadCsv(d.items, "suppliers.csv"); }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Suppliers
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { const d = await listCategories(true); downloadCsv(d, "categories.csv"); }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Categories
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { const d = await salesApi.list(); downloadCsv(d.items, "sales.csv"); }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Sales
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { const d = await purchasesApi.list(); downloadCsv(d.items, "purchases.csv"); }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Purchases
              </Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6">
            <h3 className="font-semibold text-destructive mb-3">⚠️ Danger Zone</h3>
            <div className="flex items-center justify-between gap-3 p-3 border rounded-md border-destructive/40 bg-destructive/5">
              <div>
                <p className="font-medium text-destructive">Clear Cloud Database</p>
                <p className="text-xs text-muted-foreground">
                  আপনার account-এর সব data cloud থেকে স্থায়ীভাবে মুছে যাবে। এই action undo করা যাবে না।
                </p>
              </div>
              <Button variant="destructive" onClick={() => setWipeOpen(true)} disabled={wiping}>
                <Trash2 className="h-4 w-4 mr-2" />Clear DB
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={wipeOpen} onOpenChange={(o) => !wiping && setWipeOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cloud database সম্পূর্ণ মুছে ফেলবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনার account-এর সব row (products, categories, sales, customers, suppliers, purchases, expenses, accounts, branches, settings ইত্যাদি) cloud থেকে স্থায়ীভাবে delete হবে। এটি undo করা যাবে ঘন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wiping}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void wipeCloudDatabase(); }}
              disabled={wiping}
              className="bg-destructive text-destructive-foreground"
            >{wiping ? "Clearing..." : "Yes, clear everything"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
