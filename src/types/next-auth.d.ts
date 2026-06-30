import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MANAGER" | "CASHIER" | "VIEWER";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: "ADMIN" | "MANAGER" | "CASHIER" | "VIEWER";
  }
}
