/**
 * AuthProvider — client-side auth using Auth.js v5 (next-auth).
 *
 * Wraps <SessionProvider> from next-auth/react and provides a backwards-compatible
 * `useAuth()` hook so that existing feature code doesn't need to change.
 *
 * Exports:
 * - AuthProvider    — wraps children with SessionProvider
 * - useAuth         — returns { session, status, login, register, logout, refresh }
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  SessionProvider as NextSessionProvider,
  useSession,
  signIn as nextSignIn,
  signOut as nextSignOut,
} from "next-auth/react";
import type { AuthSession, LoginInput, RegisterInput } from "@/features/auth/types";

// ─── Context type ───────────────────────────────────────────────────────────

interface AuthContextValue {
  session: AuthSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  signInGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Inner provider (reads from Auth.js SessionProvider) ────────────────────

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: nextSession, status, update } = useSession();

  // Map Auth.js session → app AuthSession
  const session: AuthSession | null = useMemo(() => {
    if (!nextSession?.user) return null;

    return {
      user: {
        id: (nextSession.user as any).id ?? "",
        email: nextSession.user.email ?? "",
        name: nextSession.user.name ?? "",
        image: nextSession.user.image,
        role: (nextSession.user as any).role ?? "CASHIER",
      },
      expires: nextSession.expires,
    };
  }, [nextSession]);

  const mappedStatus = useMemo<AuthContextValue["status"]>(() => {
    if (status === "loading") return "loading";
    return session ? "authenticated" : "unauthenticated";
  }, [status, session]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await nextSignIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(
        result.error === "CredentialsSignin"
          ? "Invalid email or password"
          : result.error,
      );
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Registration failed" }));
      throw new Error(err.message ?? err.error ?? "Registration failed");
    }

    // Auto-login after successful registration
    const loginResult = await nextSignIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    if (loginResult?.error) {
      throw new Error("Account created but auto-login failed. Please sign in manually.");
    }
  }, []);

  const logout = useCallback(async () => {
    await nextSignOut({ redirect: false });
  }, []);

  const refresh = useCallback(async () => {
    await update();
  }, [update]);

  const signInGoogle = useCallback(async () => {
    await nextSignIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status: mappedStatus,
      login,
      register,
      logout,
      refresh,
      signInGoogle,
    }),
    [session, mappedStatus, login, register, logout, refresh, signInGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Public provider (wraps SessionProvider) ─────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <NextSessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </NextSessionProvider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
