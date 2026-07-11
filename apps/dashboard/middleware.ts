import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: route protection + storefront rewrites + backward compat.
 *
 * ── Auth Protection ──
 * /dashboard/*       → redirect to /login (unauthenticated)
 * /api/*             → return 401 JSON (unauthenticated)
 * /login, /register  → redirect to /dashboard (authenticated)
 *
 * For API routes, the middleware verifies the session cookie and passes
 * the authenticated status to the route handler via custom request headers.
 * The apiHandler then reads these headers instead of calling auth() again.
 *
 * ── Storefront ──
 * /storefront/* → rewrite to route group paths
 *
 * ── Backward compatibility ──
 * Old admin paths (/pos, /products, etc.) → 308 redirect to /dashboard/*
 */

const SESSION_COOKIES = [
  "next-auth.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "__Secure-authjs.session-token",
];

function hasToken(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => !!req.cookies.get(name)?.value);
}

const adminRedirects: Record<string, string> = {
  "/pos": "/dashboard/sales/create",
  "/products": "/dashboard/products",
  "/categories": "/dashboard/categories",
  "/inventory": "/dashboard/inventory",
  "/sales": "/dashboard/sales",
  "/returns": "/dashboard/returns",
  "/purchases": "/dashboard/purchases",
  "/online-orders": "/dashboard/online-orders",
  "/customers": "/dashboard/customers",
  "/suppliers": "/dashboard/suppliers",
  "/accounts": "/dashboard/accounts",
  "/expenses": "/dashboard/expenses",
  "/reports": "/dashboard/reports",
  "/settings": "/dashboard/settings",
  "/notifications": "/dashboard/notifications",
  "/stock-audit": "/dashboard/stock-audit",
  "/dues": "/dashboard/dues",
  "/sales-history": "/dashboard/sales-history",
  "/shop-setup": "/dashboard/shop-setup",
  "/warranty-lookup": "/dashboard/warranty-lookup",
  "/billing": "/dashboard/billing",
  "/warranty-claims": "/dashboard/warranty-claims",
  "/restock-orders": "/dashboard/restock-orders",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasToken(request);
  const isApiRoute = pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/storefront/");

  // ─── 0. API routes ──────────────────────────────────────────────────────
  if (isApiRoute) {
    if (!authenticated) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED", message: "Session required" },
        { status: 401 },
      );
    }
    // Pass auth status via header — apiHandler will read this
    const response = NextResponse.next();
    response.headers.set("x-auth-authenticated", "true");
    return response;
  }

  // ─── 1. Dashboard pages: redirect to login (unauthenticated) ───────────
  if (pathname.startsWith("/dashboard") && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── 2. Auth pages: redirect to dashboard (authenticated) ─────────────
  if ((pathname === "/login" || pathname === "/register") && authenticated) {
    if (request.nextUrl.searchParams.get("unauthenticated") === "true") {
      const response = NextResponse.next();
      SESSION_COOKIES.forEach((name) => {
        response.cookies.delete(name);
      });
      return response;
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }


  // ─── 3. Storefront: rewrite /storefront/* → route group paths ─────────
  if (pathname.startsWith("/storefront")) {
    const rest = pathname.replace(/^\/storefront/, "");
    const newPath = rest && rest !== "/" ? rest : "/shop";
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.rewrite(url);
  }

  // ─── 4. Backward-compatible redirects ─────────────────────────────────
  for (const [oldPrefix, newPrefix] of Object.entries(adminRedirects)) {
    if (pathname === oldPrefix || pathname.startsWith(oldPrefix + "/")) {
      const suffix = pathname === oldPrefix ? "" : pathname.slice(oldPrefix.length);
      const url = request.nextUrl.clone();
      url.pathname = newPrefix + suffix;
      return NextResponse.redirect(url, 308);
    }
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: [
    // Auth
    "/dashboard", "/dashboard/:path*",
    "/api/:path*",
    "/login", "/register",
    // Storefront
    "/storefront", "/storefront/:path*",
    // Old admin paths
    "/pos", "/pos/:path*",
    "/products", "/products/:path*",
    "/categories", "/categories/:path*",
    "/inventory", "/inventory/:path*",
    "/sales", "/sales/:path*",
    "/returns", "/returns/:path*",
    "/purchases", "/purchases/:path*",
    "/online-orders", "/online-orders/:path*",
    "/customers", "/customers/:path*",
    "/suppliers", "/suppliers/:path*",
    "/accounts", "/accounts/:path*",
    "/expenses", "/expenses/:path*",
    "/reports", "/reports/:path*",
    "/settings", "/settings/:path*",
    "/notifications", "/notifications/:path*",
    "/stock-audit", "/stock-audit/:path*",
    "/dues", "/dues/:path*",
    "/sales-history", "/sales-history/:path*",
    "/shop-setup", "/shop-setup/:path*",
    "/warranty-lookup", "/warranty-lookup/:path*",
    "/billing", "/billing/:path*",
    "/warranty-claims", "/warranty-claims/:path*",
    "/restock-orders", "/restock-orders/:path*",
  ],
};
