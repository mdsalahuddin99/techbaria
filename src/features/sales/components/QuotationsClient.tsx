"use client";

import { useHeldSales } from "@/features/pos/hooks";
import { useT } from "@/features/i18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { formatPrice } from "@/features/storefront/lib/formatPrice";
import { Loader2, FileText, ArrowRight, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DraftInvoicePreview, type HeldSaleForPrint } from "@/features/sales/components";
import { useSettings } from "@/features/settings/hooks";

export function QuotationsClient() {
  const { heldSales, isLoading, resumeHeldSale, deleteHeldSale } = useHeldSales();
  const t = useT();
  const router = useRouter();
  const settings = useSettings();

  const [previewDraft, setPreviewDraft] = useState<HeldSaleForPrint | null>(null);

  const handleLoad = (id: string) => {
    router.push(`/dashboard/sales/create?loadDraft=${id}`);
  };

  const handlePreview = (sale: any) => {
    // Transform to HeldSaleForPrint
    const draft: HeldSaleForPrint = {
      id: sale.id,
      customerName: sale.customerName || sale.customer?.name || "Cash Customer",
      customer: sale.customer ? { ...sale.customer, phone: sale.customer.phone || null } : null,
      cart: sale.cart,
      discount: sale.discount,
      heldAt: new Date(sale.heldAt).toISOString(),
      salesPerson: sale.salesPerson || sale.cashier,
    };
    setPreviewDraft(draft);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quotation?")) {
      await deleteHeldSale(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            Quotations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your saved draft invoices and quotations.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heldSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No quotations found.
                    </td>
                  </tr>
                ) : (
                  heldSales.map((sale: any) => {
                    const totalValue =
                      sale.cart.reduce(
                        (acc: number, item: any) =>
                          acc + Number(item.price) * item.qty - (item.discount || 0),
                        0
                      ) - Number(sale.discount || 0);

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {new Date(sale.heldAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {sale.customerName || sale.customer?.name || "Cash Customer"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {sale.cart.length} items
                        </td>
                        <td className="px-4 py-3 font-medium text-emerald-600">
                          {formatPrice(totalValue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreview(sale)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Print/Preview"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleLoad(sale.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Load to POS"
                            >
                              Load <ArrowRight className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DraftInvoicePreview
        draft={previewDraft}
        settings={settings}
        open={!!previewDraft}
        onClose={() => setPreviewDraft(null)}
      />
    </div>
  );
}
