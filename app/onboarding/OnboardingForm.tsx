"use client";

import { useEffect, useState } from "react";
import { completeOnboarding } from "@/actions/profile";
import { DistrictSelect } from "@/components/selects";
import { Feedback, SubmitButton, useActionForm } from "@/components/form";
import { Wordmark } from "@/components/Logo";

export function OnboardingForm({
  defaultName,
  defaultEmail,
  image,
}: {
  defaultName: string;
  defaultEmail: string;
  image: string | null;
}) {
  const [role, setRole] = useState<"student" | "parent" | "tutor">("student");
  const [imgError, setImgError] = useState(false);
  const [state, formAction, pending] = useActionForm(completeOnboarding);

  useEffect(() => {
    if (state?.ok) {
      window.location.href = "/";
    }
  }, [state]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-12">
      <div className="mb-6"><Wordmark /></div>

      <div className="card w-full max-w-xl p-8">
        <div className="mb-6 flex items-center gap-3">
          {image && !imgError ? (
            <img
              src={image}
              alt=""
              width={48}
              height={48}
              onError={() => setImgError(true)}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-600">
              {(defaultEmail || "U")[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900">{defaultName || "Welcome"}</p>
            <p className="text-sm text-slate-500">{defaultEmail}</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900">Complete your profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us a little about yourself so we can set up the right dashboard.
        </p>

        <form action={formAction} className="mt-6 space-y-5">
          {/* Role choice */}
          <div>
            <span className="label">I am signing up as a</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["student", "parent", "tutor"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    role === r
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="block font-semibold capitalize text-slate-800">{r}</span>
                  <span className="text-xs text-slate-500">
                    {r === "student"
                      ? "I am the learner"
                      : r === "parent"
                        ? "I manage students under my account"
                        : "I teach and want to be booked for sessions"}
                  </span>
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ob-name">Full name</label>
              <input id="ob-name" name="name" className="input" defaultValue={defaultName} required />
            </div>
            <div>
              <label className="label" htmlFor="ob-phone">Phone</label>
              <input id="ob-phone" name="phone" type="tel" className="input" placeholder="01XXXXXXXXX" required />
            </div>
            <div>
              <label className="label">District</label>
              <DistrictSelect />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ob-location">Location / Area (optional)</label>
              <input id="ob-location" name="location" className="input" placeholder="e.g. Dhanmondi" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton pending={pending}>Continue to dashboard</SubmitButton>
            <Feedback state={state} />
          </div>
        </form>
      </div>
    </div>
  );
}
