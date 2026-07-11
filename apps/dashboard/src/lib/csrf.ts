// src/lib/csrf.ts
/**
 * CSRF protection using next-csrf.
 *
 * Gracefully skips if CSRF_SECRET is not set (dev mode).
 * In production, set CSRF_SECRET in your environment.
 */
import { nextCsrf } from 'next-csrf';

const isConfigured = !!process.env.CSRF_SECRET;
let protect: ((req: Request, res: any) => Promise<void>) | null = null;
let warned = false;

if (isConfigured) {
  const csrf = nextCsrf({ secret: process.env.CSRF_SECRET! });
  protect = csrf.csrf as unknown as (req: Request, res: any) => Promise<void>;
} else if (!warned) {
  console.warn('[csrf] CSRF_SECRET not set — CSRF protection disabled');
  warned = true;
}

export async function csrfProtection(req: Request, res: any): Promise<void> {
  if (!protect) return; // not configured → skip
  await protect(req, res);
}
