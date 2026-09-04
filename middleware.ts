import { NextRequest, NextResponse } from "next/server";

/**
 * Gates the trading dashboard behind HTTP Basic Auth.
 *
 * `/dashboard`, `/scanner`, and every `/api/bot/*` route are otherwise wide
 * open: the bot proxy in `lib/bot/client.ts` authenticates *to the bot*
 * server-side, but nothing here authenticated *the visitor* to this app.
 * Since `PUT /api/bot/settings` can pause the live bot and change its risk
 * limits (buy size, confidence threshold, stop-loss/take-profit), leaving
 * these routes unauthenticated on a public deployment lets anyone who finds
 * the URL control a real trading bot. This middleware is the fix — it does
 * not touch the bot's own password, which stays entirely server-side.
 *
 * Basic Auth (not a cookie session) is deliberate for a single-operator
 * tool: credentials are cached per-origin by the browser and are not
 * auto-attached to cross-site requests the way cookies are, so this is not
 * exposed to classic CSRF.
 */

const PROTECTED_PATHS = ["/dashboard", "/scanner", "/api/bot"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * `/api/bot/*` handlers always respond with the `{ connected, data, error }`
 * envelope (see `lib/bot/route.ts`) — every client fetch calls `.json()`
 * unconditionally rather than checking content-type first. A denial from
 * *this* middleware is the one place that could break that contract, so API
 * routes get the same envelope shape instead of plain text: otherwise
 * `.json()` throws, and the real reason (not logged in, not configured) gets
 * lost behind a generic "could not reach the bot" error.
 *
 * Page routes (`/dashboard`, `/scanner`) keep a plain-text body — the
 * `www-authenticate` header is what matters there, to trigger the browser's
 * native Basic Auth prompt on navigation.
 */
function denial(pathname: string, status: 401 | 503, message: string): NextResponse {
  const headers: HeadersInit =
    status === 401 ? { "www-authenticate": 'Basic realm="Trading Dashboard"' } : {};

  if (pathname.startsWith("/api/bot")) {
    return NextResponse.json(
      { connected: false, data: null, error: message },
      { status, headers }
    );
  }
  return new NextResponse(message, { status, headers });
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const user = process.env.DASHBOARD_BASIC_AUTH_USER;
  const pass = process.env.DASHBOARD_BASIC_AUTH_PASSWORD;

  if (!user || !pass) {
    // Fail closed in production: an unconfigured dashboard must not
    // silently serve a live trading bot's controls to the public internet.
    // Local development stays unauthenticated for convenience.
    if (process.env.NODE_ENV === "production") {
      return denial(
        pathname,
        503,
        "Dashboard is not configured. Set DASHBOARD_BASIC_AUTH_USER and DASHBOARD_BASIC_AUTH_PASSWORD."
      );
    }
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPass = decoded.slice(separatorIndex + 1);
    if (suppliedUser === user && suppliedPass === pass) {
      return NextResponse.next();
    }
  }

  return denial(pathname, 401, "Authentication required.");
}

export const config = {
  matcher: ["/dashboard/:path*", "/scanner/:path*", "/api/bot/:path*"],
};
