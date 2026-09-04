"use client";

import { useActionState } from "react";
import type { ActionState } from "@/actions/_shared";

/**
 * Adapts a single-arg server action `(formData) => Promise<ActionState>`
 * for use with React 19's `useActionState`, which expects
 * `(prevState, formData) => Promise<ActionState>`.
 * The single-arg action can still be used directly as a plain `<form action>`.
 */
export function useActionForm(action: (fd: FormData) => Promise<ActionState>) {
  return useActionState(
    async (_prev: ActionState | undefined, fd: FormData) => action(fd),
    undefined,
  );
}

/**
 * Wraps a server action (that returns a value) so it can be used directly as a
 * plain `<form action>` (which expects a void-returning function). The return
 * value is discarded; errors are still handled inside the action.
 */
export function asFormAction(action: (fd: FormData) => Promise<unknown>) {
  return (fd: FormData) => {
    void action(fd);
  };
}

export function Feedback({ state }: { state: ActionState | undefined }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Saved successfully.
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
      </svg>
      <span>{state.error ?? "Something went wrong."}</span>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  variant = "primary",
  className = "",
}: {
  pending: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const cls =
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-secondary";
  return (
    <button type="submit" disabled={pending} className={`${cls} ${className}`}>
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
