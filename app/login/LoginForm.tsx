"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Wordmark } from "@/components/Logo";
import { registerUser } from "@/actions/auth";

const errorMessages: Record<string, string> = {
  OAuthSignin: "Could not start Google sign-in. Check your Google OAuth credentials.",
  OAuthCallback: "Google sign-in failed. Make sure your redirect URI and credentials are configured.",
  OAuthCallbackError: "Google sign-in failed. Verify your OAuth configuration in Google Cloud Console.",
  CredentialsSignin: "Invalid email or password. Please check your credentials and try again.",
  CallbackRouteError: "Database or authentication error occurred during sign-in. Please try again.",
  Configuration: "Authentication configuration error. Check environment variables in .env.",
  suspended: "Your account has been suspended. Please contact an administrator.",
  default: "Sign-in failed. Please try again.",
};

export function LoginForm({
  demoEnabled,
  googleConfigured,
  error,
}: {
  demoEnabled: boolean;
  googleConfigured: boolean;
  error?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Password validation display
  const [password, setPassword] = useState("");
  const pwChecks = {
    length: password.length >= 8,
    special: /[^A-Za-z0-9]/.test(password),
    digits: (password.match(/\d/g) || []).length >= 2,
  };

  const handleCredentialsSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string)?.trim();
    const pw = fd.get("password") as string;
    if (!email || !pw) {
      setFormError("Please enter both email and password.");
      return;
    }
    startTransition(() => {
      void signIn("credentials", { email, password: pw, callbackUrl: "/" });
    });
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerUser(fd);
      if (result.ok) {
        setFormSuccess("Account created! Signing you in…");
        const email = (fd.get("email") as string)?.trim();
        const pw = fd.get("password") as string;
        void signIn("credentials", { email, password: pw, callbackUrl: "/" });
      } else {
        setFormError(result.error ?? "Registration failed.");
      }
    });
  };

  const demo = (role: "student" | "parent" | "tutor") =>
    startTransition(() => {
      void signIn("demo", { role, callbackUrl: "/" });
    });

  const google = () =>
    startTransition(() => {
      void signIn("google", { callbackUrl: "/" });
    });

  const displayError = formError || (error ? (errorMessages[error] ?? errorMessages.default) : null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-12">
      <div className="mb-8">
        <div className="flex justify-center">
          <Wordmark />
        </div>
      </div>

      <div className="card w-full max-w-md p-8">
        <h1 className="text-center text-xl font-bold text-slate-900">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          {mode === "signin"
            ? "Sign in to manage your profile and academic information."
            : "Get started with Tutor-Connect today."}
        </p>

        {displayError && (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {displayError}
          </div>
        )}
        {formSuccess && (
          <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {formSuccess}
          </div>
        )}

        {/* Email / Password Form */}
        {mode === "signin" ? (
          <form onSubmit={handleCredentialsSignIn} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-base">
              {pending ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                name="name"
                type="text"
                className="input"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                name="password"
                type="password"
                className="input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* Password strength indicators */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <PwCheck ok={pwChecks.length} label="At least 8 characters" />
                  <PwCheck ok={pwChecks.special} label="At least 1 special character" />
                  <PwCheck ok={pwChecks.digits} label="At least 2 numbers" />
                </div>
              )}
            </div>
            <div>
              <label className="label" htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                name="confirmPassword"
                type="password"
                className="input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-base">
              {pending ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        {/* Toggle sign-in / sign-up */}
        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("signup"); setFormError(null); setFormSuccess(null); setPassword(""); }}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("signin"); setFormError(null); setFormSuccess(null); setPassword(""); }}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or continue with
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Google Login */}
        {googleConfigured ? (
          <button onClick={google} disabled={pending} className="btn-secondary w-full py-2.5 text-base">
            <GoogleIcon />
            {pending ? "Signing in…" : "Continue with Google"}
          </button>
        ) : (
          <div>
            <button
              disabled
              className="btn-secondary w-full cursor-not-allowed py-2.5 text-base opacity-60"
              title="Add Google OAuth credentials to .env to enable"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <p className="mt-2 text-center text-xs text-amber-600">
              Google sign-in needs OAuth credentials in{" "}
              <code className="rounded bg-amber-50 px-1 py-0.5 font-mono">.env</code>{" "}
              (see README). Meanwhile, use email sign-up or a demo account below.
            </p>
          </div>
        )}

        {demoEnabled && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or try a demo account
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button onClick={() => demo("student")} disabled={pending} className="btn-secondary py-2">
                Student
              </button>
              <button onClick={() => demo("parent")} disabled={pending} className="btn-secondary py-2">
                Parent
              </button>
              <button onClick={() => demo("tutor")} disabled={pending} className="btn-secondary py-2">
                Tutor
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PwCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-slate-400"}`}>
      {ok ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
      {label}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
