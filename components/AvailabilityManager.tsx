"use client";

import type { AvailabilitySlot } from "@prisma/client";
import { addAvailabilitySlot, deleteAvailabilitySlot } from "@/actions/tutor";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { Feedback, SubmitButton, useActionForm, asFormAction } from "@/components/form";
import { EmptyState } from "@/components/ui";
import { CloseIcon } from "@/components/icons";

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function AvailabilityManager({ slots }: { slots: AvailabilitySlot[] }) {
  const [state, formAction, pending] = useActionForm(addAvailabilitySlot);

  const byDay = DAYS_OF_WEEK.map((day) => ({
    day,
    slots: slots.filter((s) => s.dayOfWeek === day),
  })).filter((d) => d.slots.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900">Weekly availability</h3>
        <p className="text-sm text-slate-500">
          Add the time slots you&apos;re open for sessions — students can only book what you list here.
        </p>
      </div>

      {slots.length === 0 ? (
        <EmptyState
          title="No availability set yet"
          hint="Add a slot below so students can find open times to book."
        />
      ) : (
        <div className="space-y-3">
          {byDay.map(({ day, slots }) => (
            <div key={day}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {day}
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                      slot.isBooked
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {to12h(slot.startTime)}–{to12h(slot.endTime)}
                    {slot.isBooked ? (
                      <span className="badge bg-slate-200 text-slate-500">Booked</span>
                    ) : (
                      <form action={asFormAction(deleteAvailabilitySlot)}>
                        <input type="hidden" name="id" value={slot.id} />
                        <button
                          type="submit"
                          className="text-slate-400 hover:text-rose-600"
                          aria-label="Remove slot"
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
      >
        <div>
          <label className="label" htmlFor="as-day">Day</label>
          <select id="as-day" name="dayOfWeek" className="input" defaultValue="Saturday">
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="as-start">Start</label>
          <input id="as-start" name="startTime" type="time" className="input" defaultValue="16:00" required />
        </div>
        <div>
          <label className="label" htmlFor="as-end">End</label>
          <input id="as-end" name="endTime" type="time" className="input" defaultValue="17:00" required />
        </div>
        <SubmitButton pending={pending} variant="secondary">Add slot</SubmitButton>
      </form>
      <Feedback state={state} />
    </div>
  );
}
