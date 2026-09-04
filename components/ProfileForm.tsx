"use client";

import { updateProfile } from "@/actions/profile";
import { DistrictSelect } from "@/components/selects";
import { useActionForm, Feedback, SubmitButton } from "@/components/form";

export function ProfileForm({
  name,
  phone,
  location,
  district,
}: {
  name: string | null;
  phone: string | null;
  location: string | null;
  district: string | null;
}) {
  const [state, formAction, pending] = useActionForm(updateProfile);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pf-name">Full name</label>
          <input id="pf-name" name="name" className="input" defaultValue={name ?? ""} required />
        </div>
        <div>
          <label className="label" htmlFor="pf-phone">Phone</label>
          <input
            id="pf-phone"
            name="phone"
            type="tel"
            className="input"
            defaultValue={phone ?? ""}
            placeholder="01XXXXXXXXX"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="pf-location">Location / Area</label>
          <input id="pf-location" name="location" className="input" defaultValue={location ?? ""} placeholder="e.g. Dhanmondi" />
        </div>
        <div>
          <label className="label" htmlFor="pf-district">District</label>
          <DistrictSelect defaultValue={district ?? undefined} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending}>Save changes</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}
