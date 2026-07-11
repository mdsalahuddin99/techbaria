// src/features/auth/components/ProtectedRoute.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth";

/**
 * Guard component for routes that require authentication.
 * If unauthenticated, redirects to /login preserving the original path.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.replace(`/login?from=${pathname}`);
    return null;
  }

  // Authenticated: render children directly (Next.js layout will render nested content)
  return <>{children}</>;
}
