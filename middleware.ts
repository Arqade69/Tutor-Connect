import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/", "/login"];

function dashboardFor(role: string | undefined) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "parent") return "/dashboard/parent";
  if (role === "tutor") return "/dashboard/tutor";
  return "/dashboard/student";
}

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const path = nextUrl.pathname;

  // Never intercept Auth.js or payment webhook API routes
  if (path.startsWith("/api/auth") || path.startsWith("/api/payments")) return NextResponse.next();

  const isPublic = PUBLIC_ROUTES.includes(path);
  const isOnboarding = path === "/onboarding";

  // 1) Not logged in → only public + onboarding are accessible
  if (!isLoggedIn && !isPublic && !isOnboarding) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 2) Logged in, lingering on "/" or "/login" → bounce to their dashboard.
  //    The dashboard layout reads fresh DB data and will redirect to /onboarding
  //    if the profile isn't complete yet. We do NOT check `onboarded` here because
  //    the JWT cookie can be stale, which causes redirect loops.
  if (
    isLoggedIn &&
    session!.user.status !== "suspended" &&
    (path === "/login" || path === "/")
  ) {
    return NextResponse.redirect(new URL(dashboardFor(session!.user.role), nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except Auth.js API routes, payment webhooks, our session-clear route,
  // static assets, and image optimization.
  matcher: ["/((?!api/auth|api/payments|auth/|_next/static|_next/image|favicon.ico).*)"],
};
