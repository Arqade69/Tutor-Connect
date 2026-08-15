import { revalidatePath } from "next/cache";
import { AuthError, requireRole, requireUser } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string };

/**
 * Runs an action body and converts thrown errors (AuthError especially)
 * into a friendly { ok: false, error } result.
 */
export async function guard(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong. Please try again.",
    };
  }
}

// ---- shared validators -------------------------------------------------

export function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function requireText(value: unknown, field: string, min = 1, max = 200): string {
  const v = clean(value);
  if (v.length < min) throw new Error(`${field} is required.`);
  if (v.length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
  return v;
}

export function validatePhone(value: unknown): string {
  const v = clean(value);
  if (!v) throw new Error("Phone number is required.");
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length < 6 || digits.length > 15)
    throw new Error("Enter a valid phone number (6–15 digits).");
  return v;
}

// re-export for convenience
export { revalidatePath, requireRole, requireUser };
