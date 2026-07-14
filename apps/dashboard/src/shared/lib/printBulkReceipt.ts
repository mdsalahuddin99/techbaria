import { formatCurrency, formatDateTime } from "@/shared/lib/format";

export function buildBulkReceiptHtml(data: any): string {
  const today = new Date();
  
  const rowsHtml = data.invoicesAffected?.map((inv: any) => `
    <tr>
      <td style="padding: 12px 8px; font-weight: 500;">${inv.invoiceNo}</td>
      <td style="padding: 12px 8px; color: #475569;">${formatDateTime(new Date(inv.date))}</td>
      <td style="padding: 12px 8px; text-align: right;">${formatCurrency(inv.total)}</td>
      <td style="padding: 12px 8px; text-align: right; color: #475569;">${formatCurrency(inv.previousDue)}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #059669; background-color: #ecfdf5;">${formatCurrency(inv.collected)}</td>
      <td style="padding: 12px 8px; text-align: right;">
        ${inv.newDue > 0 ? `<span style="color: #ef4444; font-weight: 500;">${formatCurrency(inv.newDue)}</span>` : `<span style="color: #94a3b8;">Paid</span>`}
      </td>
    </tr>
  `).join("") || "";

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Bulk Payment Receipt - ${data.transactionId}</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; color: #000; margin: 0; padding: 20px; font-size: 14px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; }
        .title { font-size: 24px; font-weight: 700; margin: 0 0 4px 0; }
        .subtitle { color: #64748b; margin: 0; }
        .brand { font-size: 18px; font-weight: 600; margin: 0; text-align: right; }
        .summary { display: flex; justify-content: space-between; align-items: center; padding: 16px; background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; margin-bottom: 32px; }
        .summary-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin: 0 0 4px 0; }
        .summary-value { font-size: 18px; font-weight: 600; margin: 0; }
        .summary-amount { font-size: 24px; font-weight: 700; color: #059669; margin: 0; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        th { padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 500; }
        th.right { text-align: right; }
        td { border-bottom: 1px solid #f1f5f9; }
        .footer { text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 48px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1 class="title">BULK PAYMENT RECEIPT</h1>
            <p class="subtitle">Receipt No: ${data.transactionId.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <h2 class="brand">Tech Baria</h2>
            <p class="subtitle">Date: ${formatDateTime(today)}</p>
          </div>
        </div>

        <div class="summary">
          <div>
            <p class="summary-label">Received From</p>
            <p class="summary-value">${data.customerName || 'Customer'}</p>
          </div>
          <div>
            <p class="summary-label" style="text-align: right;">Total Amount Paid</p>
            <p class="summary-amount">${formatCurrency(data.totalCollected)}</p>
          </div>
        </div>

        <div>
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Payment Distribution</h3>
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th class="right">Bill Amount</th>
                <th class="right">Previous Due</th>
                <th class="right" style="color: #047857; background-color: #ecfdf5;">Paid Now</th>
                <th class="right">Current Due</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px 0;">Thank you for your payment.</p>
          <p style="margin: 0;">This is a system generated receipt and does not require a signature.</p>
        </div>
      </div>
    </body>
  </html>`;
}
