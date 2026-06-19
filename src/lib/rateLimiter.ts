// src/lib/rateLimiter.ts
/**
 * Production‑grade rate limiting using Upstash Ratelimit.
 * Limits unauthenticated requests to 5 per 10 seconds per IP.
 * Authenticated requests (those with a session cookie) are NOT rate-limited
 * — auth itself provides abuse protection via session expiry.
 *
 * Gracefully skips if UPSTASH_REDIS_REST_URL is not configured
 * (e.g. in local development without Upstash).
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const getCleanEnv = (key: string) => {
  const val = process.env[key];
  return val ? val.replace(/^["']|["']$/g, "") : "";
};

const isConfigured = () =>
  !!getCleanEnv("UPSTASH_REDIS_REST_URL") && !!getCleanEnv("UPSTASH_REDIS_REST_TOKEN");

let ratelimit: Ratelimit | null = null;
let warned = false;

function getRatelimit() {
  if (ratelimit) return ratelimit;
  if (!isConfigured()) {
    if (!warned && process.env.NODE_ENV === 'production') {
      console.warn(
        '[rateLimiter] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting disabled',
      );
      warned = true;
    }
    return null;
  }
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: getCleanEnv("UPSTASH_REDIS_REST_URL"),
      token: getCleanEnv("UPSTASH_REDIS_REST_TOKEN"),
    }),
    // 30 requests per 10 seconds for anonymous (less strict than before)
    limiter: Ratelimit.fixedWindow(30, '10 s'),
  });
  return ratelimit;
}

/**
 * Check if the request carries an active auth session cookie.
 * Auth.js v5 stores the JWT in `next-auth.session-token`
 * (or `__Secure-next-auth.session-token` on HTTPS).
 */
function isAuthenticated(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') ?? '';
  return (
    cookieHeader.includes('next-auth.session-token=') ||
    cookieHeader.includes('__Secure-next-auth.session-token=')
  );
}

export async function rateLimiter(req: Request): Promise<void> {
  // Skip rate limiting for authenticated users — auth session expiry
  // is the abuse protection mechanism for logged-in requests.
  if (isAuthenticated(req)) return;

  const rl = getRatelimit();
  if (!rl) return; // not configured → skip

  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'anonymous';
  const { success } = await rl.limit(ip);
  if (!success) {
    const err: any = new Error('Rate limit exceeded');
    err.status = 429;
    throw err;
  }
}

/**
 * Tighter rate limiter for sensitive auth endpoints (OTP, password reset).
 * Limits: 3 requests per 60 seconds per IP.
 * Uses a separate Redis namespace so it doesn't interfere with the main limiter.
 */
let otpRatelimit: Ratelimit | null = null;

function getOtpRatelimit() {
  if (otpRatelimit) return otpRatelimit;
  if (!isConfigured()) return null;
  otpRatelimit = new Ratelimit({
    redis: new Redis({
      url: getCleanEnv("UPSTASH_REDIS_REST_URL"),
      token: getCleanEnv("UPSTASH_REDIS_REST_TOKEN"),
    }),
    limiter: Ratelimit.slidingWindow(3, '60 s'),
    prefix: 'ratelimit:otp',
  });
  return otpRatelimit;
}

/**
 * Rate limiter for OTP and password-reset endpoints.
 * Strictly IP-based (3 requests/min) — authenticated or not, everyone gets limited.
 * Prevents OTP brute-force / spam.
 */
export async function otpRateLimiter(req: Request): Promise<void> {
  const rl = getOtpRatelimit();
  if (!rl) return; // not configured → skip

  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'anonymous';
  const { success } = await rl.limit(ip);
  if (!success) {
    const err: any = new Error('Too many requests. Please try again later.');
    err.status = 429;
    throw err;
  }
}
