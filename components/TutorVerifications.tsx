"use client";

import { useMemo, useState } from "react";
import { adminVerifyTutor } from "@/actions/admin";
import { asFormAction } from "@/components/form";
import { EmptyState } from "@/components/ui";

export type AdminTutorProfile = {
  id: string;
  userId: string;
  tagline: string | null;
  bio: string | null;
  subjects: string[];
  classLevels: string[];
  medium: string;
  hourlyFee: number;
  isPublic: boolean;
  verificationStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    location: string | null;
    district: string | null;
    status: string;
  };
};

export function TutorVerifications({ tutors }: { tutors: AdminTutorProfile[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors
      .filter((t) => (statusFilter === "all" ? true : t.verificationStatus === statusFilter))
      .filter((t) => {
        if (!q) return true;
        const nameMatch = t.user.name?.toLowerCase().includes(q);
        const emailMatch = t.user.email.toLowerCase().includes(q);
        const taglineMatch = t.tagline?.toLowerCase().includes(q);
        const subjectsMatch = t.subjects.some((s) => s.toLowerCase().includes(q));
        return nameMatch || emailMatch || taglineMatch || subjectsMatch;
      });
  }, [tutors, query, statusFilter]);

  const pendingCount = tutors.filter((t) => t.verificationStatus === "pending").length;
  const approvedCount = tutors.filter((t) => t.verificationStatus === "approved").length;
  const rejectedCount = tutors.filter((t) => t.verificationStatus === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Tutor Registrations & Verifications</h3>
            {pendingCount > 0 && (
              <span className="badge bg-amber-100 text-amber-800 font-medium">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Review tutor details, subjects, and credentials before approving them for student bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tutor, subject, email..."
            className="input max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "pending" | "approved" | "rejected")
            }
            className="input max-w-[150px]"
          >
            <option value="all">All Status ({tutors.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="approved">Approved ({approvedCount})</option>
            <option value="rejected">Rejected ({rejectedCount})</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No tutor registrations found"
          hint={
            statusFilter === "pending"
              ? "All registered tutors have been reviewed!"
              : "Try adjusting your search or status filter."
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((tutor) => (
            <div
              key={tutor.id}
              className={`rounded-xl border p-5 transition ${
                tutor.verificationStatus === "pending"
                  ? "border-amber-200 bg-amber-50/30"
                  : tutor.verificationStatus === "approved"
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-rose-200 bg-rose-50/20"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Tutor Basic Info */}
                <div className="space-y-2 lg:max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-lg">
                      {tutor.user.name || "Unnamed Tutor"}
                    </span>
                    <span className="text-sm text-slate-500">({tutor.user.email})</span>
                    <span
                      className={`badge font-medium uppercase text-[10px] tracking-wider ${
                        tutor.verificationStatus === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : tutor.verificationStatus === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {tutor.verificationStatus}
                    </span>
                    {!tutor.isPublic && (
                      <span className="badge bg-slate-100 text-slate-500">Hidden profile</span>
                    )}
                  </div>

                  {tutor.tagline && (
                    <p className="text-sm font-medium text-brand-700">{tutor.tagline}</p>
                  )}

                  {tutor.bio && <p className="text-sm text-slate-600 line-clamp-3">{tutor.bio}</p>}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    <span>
                      <strong>Phone:</strong> {tutor.user.phone || "Not provided"}
                    </span>
                    <span>
                      <strong>Location:</strong>{" "}
                      {[tutor.user.location, tutor.user.district].filter(Boolean).join(", ") ||
                        "Not provided"}
                    </span>
                    <span>
                      <strong>Medium:</strong> {tutor.medium}
                    </span>
                    <span>
                      <strong>Hourly Fee:</strong> {tutor.hourlyFee} BDT
                    </span>
                  </div>

                  {/* Subjects & Class Levels */}
                  <div className="pt-2 space-y-1.5">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
                        Subjects:
                      </span>
                      {tutor.subjects.length > 0 ? (
                        <div className="inline-flex flex-wrap gap-1">
                          {tutor.subjects.map((s) => (
                            <span key={s} className="badge border border-slate-200 bg-white text-slate-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None selected</span>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
                        Classes:
                      </span>
                      {tutor.classLevels.length > 0 ? (
                        <div className="inline-flex flex-wrap gap-1">
                          {tutor.classLevels.map((c) => (
                            <span key={c} className="badge border border-slate-200 bg-white text-slate-700">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None selected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Actions */}
                <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end border-t border-slate-200/60 pt-3 lg:border-t-0 lg:pt-0">
                  {tutor.verificationStatus !== "approved" && (
                    <form action={asFormAction(adminVerifyTutor)}>
                      <input type="hidden" name="tutorProfileId" value={tutor.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
                      >
                        ✓ Approve Tutor
                      </button>
                    </form>
                  )}

                  {tutor.verificationStatus !== "rejected" && (
                    <form action={asFormAction(adminVerifyTutor)}>
                      <input type="hidden" name="tutorProfileId" value={tutor.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button
                        type="submit"
                        className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 shadow-sm"
                      >
                        ✕ Reject
                      </button>
                    </form>
                  )}

                  {tutor.verificationStatus !== "pending" && (
                    <form action={asFormAction(adminVerifyTutor)}>
                      <input type="hidden" name="tutorProfileId" value={tutor.id} />
                      <input type="hidden" name="status" value="pending" />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Set to Pending
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
