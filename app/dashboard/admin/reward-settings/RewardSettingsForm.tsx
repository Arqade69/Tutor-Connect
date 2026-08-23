"use client";

import { useState, useTransition } from "react";
import { updateRewardSettings } from "@/actions/rewards";

const FIELD_CONFIG = [
  {
    key: "points_per_taka",
    label: "Points per ৳1 Discount",
    description: "How many points equal ৳1 off the subscription price.",
    icon: "💱",
  },
  {
    key: "points_booking",
    label: "Points per Booking",
    description: "Points awarded when a Premium user books a tutoring session.",
    icon: "📅",
  },
  {
    key: "points_session_completed",
    label: "Points per Completed Session",
    description: "Points awarded when a booked session is marked as completed by the tutor.",
    icon: "✅",
  },
  {
    key: "points_review",
    label: "Points per Review",
    description: "Points awarded when a Premium user writes a tutor review.",
    icon: "⭐",
  },
];

export function RewardSettingsForm({
  settings,
}: {
  settings: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.append(key, value);
    }

    startTransition(async () => {
      const result = await updateRewardSettings(formData);
      if (result.ok) {
        setMessage({ type: "success", text: "Reward settings updated successfully!" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update settings." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELD_CONFIG.map((field) => (
          <div key={field.key} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{field.icon}</span>
              <label
                htmlFor={field.key}
                className="text-sm font-semibold text-slate-900"
              >
                {field.label}
              </label>
            </div>
            <p className="text-xs text-slate-500 mb-3">{field.description}</p>
            <input
              id={field.key}
              type="number"
              min="0"
              max="10000"
              value={values[field.key] || "0"}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-semibold text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition"
            />
          </div>
        ))}
      </div>

      {/* Subscription Renewal Points Info */}
      <div className="card p-5 bg-amber-50/50 border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">👑</span>
          <span className="text-sm font-semibold text-slate-900">Subscription Renewal Points</span>
        </div>
        <p className="text-xs text-slate-600">
          These are hardcoded for balance: <strong>Monthly renewal = +50 pts</strong>, <strong>Yearly renewal = +500 pts</strong>.
          Adjust the per-activity settings above to fine-tune engagement incentives.
        </p>
      </div>

      {/* Feedback */}
      {message && (
        <div
          className={`rounded-xl border p-4 text-center text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 py-2.5 font-semibold"
        >
          {isPending ? "Saving..." : "Save Reward Settings"}
        </button>
      </div>
    </form>
  );
}
