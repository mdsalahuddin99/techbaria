import { warrantyClaimsService } from "@/server/services/warrantyClaimsService";
import { productsService } from "@/server/services/productsService";
import { customersService } from "@/server/services/customersService";
import { suppliersService } from "@/server/services/suppliersService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { WarrantyClaimsClient } from "./WarrantyClaimsClient";

export default async function WarrantyClaimsPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [
    claims,
    productsData,
    customers,
    suppliers
  ] = await Promise.all([
    warrantyClaimsService.list(ctx),
    productsService.list(ctx),
    customersService.list(ctx),
    suppliersService.list(ctx),
  ]);

  return (
    <WarrantyClaimsClient
      initialClaims={claims as any}
      products={productsData.items as any}
      customers={customers.items as any}
      suppliers={suppliers.items as any}
    />
  );
}
