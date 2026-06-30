import { Suspense } from "react";
import { expensesService } from "@/server/services/expensesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ExpensesClient } from "./ExpensesClient";

export default async function ExpensesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [
    expensesRes,
  ] = await Promise.all([
    expensesService.list(ctx, { limit: 1000 }),
  ]);

  return (
    <Suspense fallback={<div className="p-4 text-muted-foreground">Loading expenses...</div>}>
      <ExpensesClient
        initialExpenses={expensesRes.items}
      />
    </Suspense>
  );
}
