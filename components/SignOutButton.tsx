"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

export function SignOutButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [pending, startTransition] = useTransition();

  const className =
    tone === "dark"
      ? "inline-flex w-full items-center justify-start gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-100/80 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
      : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut({ callbackUrl: "/login" }))}
      className={className}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
