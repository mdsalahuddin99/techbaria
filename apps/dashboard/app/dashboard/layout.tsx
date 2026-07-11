import { auth } from "@/server/auth/config";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth is handled by middleware.ts — it redirects unauthenticated users
  // to /login before they reach this layout. This layout only reads the
  // session for props and USER role check.
  const session = await auth();

  if (!session?.user) {
    const { redirect } = await import("next/navigation");
    redirect("/login?unauthenticated=true");
  }

  // USER role (storefront users) cannot access dashboard
  if (session?.user?.role === "USER") {
    const { redirect } = await import("next/navigation");
    redirect("/shop");
  }

  return (
    <AdminShell
      userName={session?.user?.name ?? "User"}
      userEmail={session?.user?.email ?? ""}
      userRole={session?.user?.role as "ADMIN" | "CASHIER" | "USER"}
      userPermissions={(session?.user as any)?.permissions ?? []}
    >
      {children}
    </AdminShell>
  );
}

