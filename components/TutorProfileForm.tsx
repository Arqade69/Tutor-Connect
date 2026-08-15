"use client";

import type { TutorProfile } from "@prisma/client";
import { updateTutorProfile, toggleProfileVisibility } from "@/actions/tutor";
import { SUBJECTS, CLASS_LEVELS, TEACHING_MEDIUMS } from "@/lib/constants";
import { Feedback, SubmitButton, useActionForm, asFormAction } from "@/components/form";

function ChipCheckbox({
  name,
  value,
  defaultChecked,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="badge border border-slate-300 bg-white text-slate-600 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">
        {value}
      </span>
    </label>
  );
}

export function TutorProfileForm({ profile }: { profile: TutorProfile | null }) {
  const [state, formAction, pending] = useActionForm(updateTutorProfile);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Public profile</h3>
          <p className="text-sm text-slate-500">This is what students see when they search for you.</p>
        </div>
        {profile && (
          <form action={asFormAction(toggleProfileVisibility)}>
            <button
              type="submit"
              className={`badge shrink-0 ${
                profile.isPublic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {profile.isPublic ? "Visible to students" : "Hidden from students"}
            </button>
          </form>
        )}
      </div>

      {profile?.verificationStatus === "pending" && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Pending admin verification — you can still set up your profile now, it'll go live once approved.
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <div>
          <label className="label" htmlFor="tp-tagline">Professional tagline</label>
          <input
            id="tp-tagline"
            name="tagline"
            className="input"
            defaultValue={profile?.tagline ?? ""}
            placeholder="e.g. Senior Physics Educator | 10+ Years Experience"
          />
        </div>

        <div>
          <label className="label" htmlFor="tp-bio">Bio / About me</label>
          <textarea
            id="tp-bio"
            name="bio"
            rows={3}
            className="input"
            defaultValue={profile?.bio ?? ""}
            placeholder="Tell students about your teaching style and experience"
          />
        </div>

        <div>
          <span className="label">Subjects you teach</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <ChipCheckbox
                key={s}
                name="subjects"
                value={s}
                defaultChecked={profile?.subjects.includes(s) ?? false}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="label">Class levels</span>
          <div className="flex flex-wrap gap-2">
            {CLASS_LEVELS.map((c) => (
              <ChipCheckbox
                key={c}
                name="classLevels"
                value={c}
                defaultChecked={profile?.classLevels.includes(c) ?? false}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tp-medium">Medium of instruction</label>
            <select
              id="tp-medium"
              name="medium"
              className="input"
              defaultValue={profile?.medium ?? "Bangla"}
            >
              {TEACHING_MEDIUMS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tp-fee">Hourly fee (BDT)</label>
            <input
              id="tp-fee"
              name="hourlyFee"
              type="number"
              min={0}
              className="input"
              defaultValue={profile?.hourlyFee ?? ""}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton pending={pending}>{profile ? "Save changes" : "Create profile"}</SubmitButton>
          <Feedback state={state} />
        </div>
      </form>
    </div>
  );
}
