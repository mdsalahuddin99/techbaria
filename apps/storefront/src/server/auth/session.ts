/**
 * Server-side session helper.
 *
 * Thin wrapper around `auth()` from Auth.js v5.
 * Use in Server Components, Route Handlers, or Server Actions.
 *
 * ```ts
 * const session = await getAuthSession();
 * if (!session) redirect("/login");
 * ```
 */
import "server-only";
import { auth } from "./config";

export const getAuthSession = auth;
