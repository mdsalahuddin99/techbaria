"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { requestOtpSchema } from "@/features/auth/schemas";
import { authService } from "@/services";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = requestOtpSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authService.requestOtp({ email: parsed.data.email });
      setSent(true);
      toast({
        title: "Check your email",
        description: "If an account exists, we sent a password-reset link.",
      });
    } catch (err) {
      toast({
        title: "Could not send reset link",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="We'll email you a secure link to set a new password."
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          A password-reset link has been sent to <strong>{email}</strong>. Open it on this
          device to set a new password.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
