"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LogOut } from "lucide-react";
import { ShopSetupForm, markShopOnboarded } from "@/features/settings";
import { useAuth } from "@/features/auth";

export function ShopSetupClient() {
  const router = useRouter();
  const { logout, session } = useAuth();

  const onComplete = () => {
    markShopOnboarded();
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Set up your shop</h1>
            <p className="text-muted-foreground mt-1">
              {session?.user.email
                ? `Welcome ${session.user.name}! `
                : "Welcome! "}
              Tell us about your business — you can change these later in Settings.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Shop information</CardTitle>
            <CardDescription>Required to start using AmarPOS.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShopSetupForm submitLabel="Save & enter dashboard" onComplete={onComplete} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
