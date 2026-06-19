import { redirect } from "next/navigation";

export default function StockAuditRedirect() {
  redirect("/inventory/audit");
}
