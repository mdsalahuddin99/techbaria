import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared visual shell for all auth pages (login/register/forgot/reset).
 * Pure presentation — no business logic, no service calls.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AmarPOS</h1>
          <p className="text-sm text-muted-foreground">Point of sale for mobile &amp; electronics shops</p>
        </div>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
        {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}
