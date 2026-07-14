import React, { forwardRef } from "react";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";

interface BulkPaymentReceiptProps {
  data: {
    transactionId: string;
    totalCollected: number;
    customerName: string;
    invoicesAffected: {
      saleId: string;
      invoiceNo: string;
      date: Date;
      total: number;
      previousDue: number;
      collected: number;
      newDue: number;
    }[];
  };
}

export const BulkPaymentReceipt = forwardRef<HTMLDivElement, BulkPaymentReceiptProps>(
  ({ data }, ref) => {
    const today = new Date();
    
    return (
      <div ref={ref} className="p-8 max-w-[800px] mx-auto bg-white text-black font-sans text-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6 border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-slate-900">BULK PAYMENT RECEIPT</h1>
            <p className="text-slate-500">Receipt No: {data.transactionId.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold text-slate-800">Tech Baria</h2>
            <p className="text-slate-600">Date: {formatDateTime(today)}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Received From</p>
            <p className="font-semibold text-lg text-slate-900">{data.customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Amount Paid</p>
            <p className="font-bold text-2xl text-emerald-600">{formatCurrency(data.totalCollected)}</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mb-8">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Payment Distribution</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-2 font-medium">Invoice No</th>
                <th className="py-3 px-2 font-medium">Date</th>
                <th className="py-3 px-2 font-medium text-right">Bill Amount</th>
                <th className="py-3 px-2 font-medium text-right">Previous Due</th>
                <th className="py-3 px-2 font-medium text-right bg-emerald-50 text-emerald-700">Paid Now</th>
                <th className="py-3 px-2 font-medium text-right">Current Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.invoicesAffected.map((inv) => (
                <tr key={inv.saleId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2 font-medium">{inv.invoiceNo}</td>
                  <td className="py-3 px-2 text-slate-600">{formatDateTime(inv.date)}</td>
                  <td className="py-3 px-2 text-right">{formatCurrency(inv.total)}</td>
                  <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(inv.previousDue)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-emerald-600 bg-emerald-50/50">
                    {formatCurrency(inv.collected)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {inv.newDue > 0 ? (
                      <span className="text-destructive font-medium">{formatCurrency(inv.newDue)}</span>
                    ) : (
                      <span className="text-slate-400">Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Note */}
        <div className="mt-12 text-center text-slate-500 text-xs border-t pt-6">
          <p>Thank you for your payment.</p>
          <p>This is a system generated receipt and does not require a signature.</p>
        </div>
      </div>
    );
  }
);

BulkPaymentReceipt.displayName = "BulkPaymentReceipt";
