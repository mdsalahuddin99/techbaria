import { listSalesAction } from "@/server/actions/sales";
import { DuesClient } from "./DuesClient";

export default async function DuesPage() {
  const salesRes = await listSalesAction();

  return (
    <DuesClient initialSales={salesRes.items} />
  );
}
