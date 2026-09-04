import { NextResponse, type NextRequest } from "next/server";

/**
 * Clears a stale/invalid session cookie and sends the user to /login.
 *
 * Used by the dashboard & onboarding page guards when a session JWT exists but
 * no matching DB user does (e.g. the database was re-seeded while logged in).
 * Without this, the Edge middleware ("logged in → bounce off /login to the
 * dashboard") and the page guard ("no DB user → go to /login") ping-pong into
 * ERR_TOO_MANY_REDIRECTS. This route is excluded from middleware (see the
 * matcher in middleware.ts) so it always runs and clears the cookie.
 */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  // Auth.js v5 session cookie names across http / https variants.
  for (const name of [
    "authjs.session-token",
    "next-auth.session-token",
    "__Secure-authjs.session-token",
    "__Secure-next-auth.session-token",
  ]) {
    res.cookies.set(name, "", { path: "/", expires: new Date(0) });
  }
  return res;
}
