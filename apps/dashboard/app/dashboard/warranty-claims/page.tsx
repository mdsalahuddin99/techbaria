import { warrantyClaimsService } from "@/server/services/warrantyClaimsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { WarrantyClaimsClient } from "./WarrantyClaimsClient";

export default async function WarrantyClaimsPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const claims = await warrantyClaimsService.list(ctx);

  return (
    <WarrantyClaimsClient initialClaims={JSON.parse(JSON.stringify(claims))} />
  );
}
