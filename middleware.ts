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

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="Trading Dashboard"' },
  });
}

export function middleware(req: NextRequest): NextResponse {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const user = process.env.DASHBOARD_BASIC_AUTH_USER;
  const pass = process.env.DASHBOARD_BASIC_AUTH_PASSWORD;

  if (!user || !pass) {
    // Fail closed in production: an unconfigured dashboard must not
    // silently serve a live trading bot's controls to the public internet.
    // Local development stays unauthenticated for convenience.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Dashboard is not configured. Set DASHBOARD_BASIC_AUTH_USER and DASHBOARD_BASIC_AUTH_PASSWORD.",
        { status: 503 }
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

  return unauthorized();
}

export const config = {
  matcher: ["/dashboard/:path*", "/scanner/:path*", "/api/bot/:path*"],
};
