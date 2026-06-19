import { auth } from "@/server/auth/config";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth is handled by middleware.ts — it redirects unauthenticated users
  // to /login before they reach this layout. This layout only reads the
  // session for props and VIEWER role check.
  const session = await auth();

  // VIEWER role (storefront users) cannot access dashboard
  if ((session?.user as any)?.role === "VIEWER") {
    const { redirect } = await import("next/navigation");
    redirect("/shop");
  }

  return (
    <AdminShell
      userName={session?.user?.name ?? "User"}
      userEmail={session?.user?.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
