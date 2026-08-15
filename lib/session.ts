import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Returns the currently logged-in user, freshly read from the DB so that
 * admin-driven changes (role, suspension, premium) take effect immediately.
 * Returns null if there is no session.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

/** Throws a typed error if there is no logged-in user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHORIZED", "Please sign in to continue.");
  return user;
}

/** Throws if not signed in or not the expected role (or suspended). */
export async function requireRole(role: "student" | "parent" | "admin" | "tutor"): Promise<User> {
  const user = await requireUser();
  if (user.status === "suspended")
    throw new AuthError("SUSPENDED", "Your account has been suspended. Contact an administrator.");
  if (user.role !== role)
    throw new AuthError("FORBIDDEN", "You do not have access to that page.");
  return user;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}

/** The dashboard route matching a role. */
export function dashboardFor(role: string): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "parent") return "/dashboard/parent";
  if (role === "tutor") return "/dashboard/tutor";
  return "/dashboard/student";
}
