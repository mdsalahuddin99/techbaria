// src/features/auth/components/RoleRoute.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth";
import type { UserRole } from "@/features/auth/types";

interface RoleRouteProps {
  allow: readonly UserRole[];
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Role‑based guard. Renders children only when the authenticated user's role
 * is included in `allow`. If unauthenticated, redirects to `/login`. If the role
 * is not permitted, redirects to `redirectTo` (default `/dashboard`).
 */
export function RoleRoute({ allow, redirectTo = "/dashboard", children }: RoleRouteProps) {
  const { session, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    router.replace(`/login?from=${pathname}`);
    return null;
  }

  if (!allow.includes(session.user.role)) {
    router.replace(redirectTo);
    return null;
  }

  return <>{children}</>;
}
