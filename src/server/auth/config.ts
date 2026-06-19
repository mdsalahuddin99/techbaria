/**
 * Auth.js v5 configuration.
 *
 * Exports `auth`, `handlers`, `signIn`, `signOut` — used by:
 * - `app/api/auth/[...nextauth]/route.ts` → `handlers`
 * - `apiHandler` → `auth()` for session
 * - Server Actions → `signIn()` / `signOut()`
 */
import "server-only";
import NextAuth from "next-auth";
import { getEnvSecret } from "@/lib/env";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/client";
import { verifyPassword } from "@/server/lib/password";

// Auth adapter uses the same PrismaClient as the rest of the app.
// No Accelerate extension means no incompatibility with PrismaAdapter internals.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    // Email/password login
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = verifyPassword(credentials.password as string, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role,
          shopId: (user as any).shopId,
        };
      },
    }),
    // Google OAuth (optional — only if env vars are set)
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  secret: process.env.AUTH_SECRET ?? getEnvSecret('NEXTAUTH_SECRET'),
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login?error=auth",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, copy role & shopId into the JWT
      if (user) {
        token.role = (user as any).role;
        token.shopId = (user as any).shopId;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role & shopId on the session.user object
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).shopId = token.shopId;
      }
      return session;
    },
  },
});
