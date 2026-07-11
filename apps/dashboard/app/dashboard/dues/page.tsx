import { listCustomersAction } from "@/server/actions/customers";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { DuesClient } from "./DuesClient";

export default async function DuesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [customersRes, accountsRes] = await Promise.all([
    listCustomersAction(),
    accountsService.list(ctx)
  ]);

  return (
    <DuesClient initialCustomers={customersRes.items} initialAccounts={accountsRes.items} />
  );
}
