"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { authService } from "@/shared/api-client/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const email = searchParams.get("email") ?? "";
  const otp = searchParams.get("otp") ?? "";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const next: Record<string, string> = {};
      if (form.newPassword.length < 8) next.newPassword = "At least 8 characters";
      if (form.newPassword !== form.confirmPassword) next.confirmPassword = "Passwords do not match";
      if (!email) next.email = "Missing email — please restart the reset flow";
      if (!otp) next.otp = "Missing verification code — please restart the reset flow";
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
      setErrors({});
      setSubmitting(true);
      try {
        await authService.resetPassword({ email, otp, newPassword: form.newPassword });
        toast({ title: "Password updated", description: "Sign in with your new password." });
        router.push("/login");
      } catch (err) {
        toast({
          title: "Reset failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [email, otp, form, router, toast],
  );

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a strong password for your account."
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!email || !otp ? (
        <p className="text-sm text-muted-foreground">
          Use the password-reset link from your email to continue. If you didn't request one,{" "}
          <Link href="/forgot-password" className="text-primary underline">
            request a new link
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={update("newPassword")}
              disabled={submitting}
              required
            />
            {errors.newPassword ? <p className="text-xs text-destructive">{errors.newPassword}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              disabled={submitting}
              required
            />
            {errors.confirmPassword ? <p className="text-xs text-destructive">{errors.confirmPassword}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
