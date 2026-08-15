"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "@/actions/booking";
import { getOrCreateConversation } from "@/actions/chat";
import { createReview } from "@/actions/review";
import { Modal } from "@/components/Modal";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ChatIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  StarIcon,
} from "@/components/icons";

type BookingItem = {
  id: string;
  studentId: string;
  tutorId: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  notes?: string | null;
  bookingType?: string; // "one_time" | "monthly"
  status: string; // "pending" | "confirmed" | "completed" | "cancelled"
  createdAt: Date;
  review?: { id: string; rating: number } | null;
  student?: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    role: string;
    location?: string | null;
    image?: string | null;
  };
  tutor?: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      phone?: string | null;
      location?: string | null;
      image?: string | null;
    };
  };
};

export function BookingsClient({
  initialBookings,
  userRole,
}: {
  initialBookings: BookingItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");

  // Leave-a-review modal state
  const [reviewTarget, setReviewTarget] = useState<BookingItem | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const filteredBookings = bookings.filter((b) => {
    const statusMatch =
      filterStatus === "All" || b.status.toLowerCase() === filterStatus.toLowerCase();
    const typeMatch =
      filterType === "All" ||
      (filterType === "Monthly" && b.bookingType === "monthly") ||
      (filterType === "One-Time" && b.bookingType !== "monthly");
    return statusMatch && typeMatch;
  });

  const handleStatusUpdate = (bookingId: string, newStatus: "confirmed" | "cancelled" | "completed") => {
    startTransition(async () => {
      const res = await updateBookingStatus(bookingId, newStatus);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
        router.refresh();
      }
    });
  };

  const handleOpenChat = async (targetUserId: string) => {
    startTransition(async () => {
      const res = await getOrCreateConversation(targetUserId);
      if (res.conversationId) {
        router.push(`/dashboard/chat?convId=${res.conversationId}`);
      }
    });
  };

  const openReviewModal = (booking: BookingItem) => {
    setReviewTarget(booking);
    setReviewRating(5);
    setReviewComment("");
    setReviewError(null);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewError(null);

    startTransition(async () => {
      const res = await createReview(reviewTarget.id, reviewRating, reviewComment);
      if (res.error) {
        setReviewError(res.error);
        return;
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.id === reviewTarget.id
            ? { ...b, review: { id: res.reviewId!, rating: reviewRating } }
            : b
        )
      );
      setReviewTarget(null);
      router.refresh();
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" /> Confirmed
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-300">
            <CheckCircleIcon className="h-4 w-4 text-blue-600" /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-300">
            <XCircleIcon className="h-4 w-4 text-rose-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
            <ClockIcon className="h-4 w-4 text-amber-600" /> Pending Approval
          </span>
        );
    }
  };

  const getTypeBadge = (type?: string) => {
    if (type === "monthly") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-300 px-3 py-0.5 text-xs font-extrabold text-purple-800">
          📅 Monthly Session
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300 px-3 py-0.5 text-xs font-extrabold text-sky-800">
        ⚡ One-Time Session
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Session Bookings</h1>
          <p className="text-sm text-slate-500">
            {userRole === "tutor"
              ? "Review and approve incoming student tutoring session requests."
              : "Track and manage your upcoming one-time and monthly sessions with tutors."}
          </p>
        </div>

        {userRole !== "tutor" && (
          <Link
            href="/dashboard/tutors"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700 shadow-sm"
          >
            <CalendarIcon className="h-4 w-4" /> Book New Session
          </Link>
        )}
      </div>

      {/* Filter Toolbar: Status + Session Type */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        {/* Status Tabs */}
        <div className="flex border-b sm:border-b-0 border-slate-200 text-xs font-semibold text-slate-600 gap-1 overflow-x-auto">
          {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`border-b-2 px-3 py-2 transition whitespace-nowrap ${
                filterStatus === tab
                  ? "border-brand-600 text-brand-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Session Type Filter */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Filter Session Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-800 focus:border-brand-500"
          >
            <option value="All">All Types</option>
            <option value="One-Time">⚡ One-Time</option>
            <option value="Monthly">📅 Monthly</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No bookings found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filterStatus === "All" && filterType === "All"
              ? "You haven't made or received any session bookings yet."
              : `No bookings match status "${filterStatus}" and type "${filterType}".`}
          </p>
          {userRole !== "tutor" && (
            <Link
              href="/dashboard/tutors"
              className="mt-4 inline-block rounded-lg bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              Browse Tutors
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const partnerUser =
              userRole === "tutor" ? booking.student : booking.tutor?.user;

            const isPendingTutorApproval = userRole === "tutor" && booking.status === "pending";

            return (
              <div
                key={booking.id}
                className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-center md:justify-between ${
                  isPendingTutorApproval
                    ? "border-amber-300 bg-amber-50/30 ring-1 ring-amber-200"
                    : "border-slate-200/80 bg-white"
                }`}
              >
                {/* Left Section: Partner Info & Subject */}
                <div className="flex items-start gap-4">
                  {partnerUser?.image ? (
                    <img
                      src={partnerUser.image}
                      alt={partnerUser.name ?? "User"}
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white">
                      {partnerUser?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {partnerUser?.name ?? "User"}
                      </h3>
                      <span className="rounded bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
                        {booking.subject}
                      </span>
                      {getTypeBadge(booking.bookingType)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                        {booking.date} ({booking.dayOfWeek})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                        {booking.startTime} - {booking.endTime}
                      </span>
                      {booking.bookingType === "monthly" && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          Recurring Weekly Session
                        </span>
                      )}
                    </div>

                    {booking.notes && (
                      <p className="mt-1.5 text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200 italic">
                        "{booking.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Section: Status & Tutor Approval Action */}
                <div className="flex flex-col items-start gap-3 border-t border-slate-200/60 pt-3 md:items-end md:border-t-0 md:pt-0">
                  <div>{getStatusBadge(booking.status)}</div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Chat button */}
                    {partnerUser?.id && (
                      <button
                        onClick={() => handleOpenChat(partnerUser.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                      >
                        <ChatIcon className="h-3.5 w-3.5 text-brand-600" /> Chat
                      </button>
                    )}

                    {/* Prominent Tutor Approval Button */}
                    {userRole === "tutor" && booking.status === "pending" && (
                      <button
                        onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="h-4 w-4" /> Approve Booking
                      </button>
                    )}

                    {/* Mark Completed action — tutor only; this is what unlocks
                        the student/parent's ability to leave a review */}
                    {userRole === "tutor" && booking.status === "confirmed" && (
                      <button
                        onClick={() => handleStatusUpdate(booking.id, "completed")}
                        disabled={isPending}
                        className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                      >
                        Mark Completed
                      </button>
                    )}

                    {/* Leave a Review action — student/parent only, once the
                        tutor has marked the session Completed */}
                    {userRole !== "tutor" && booking.status === "completed" && (
                      booking.review ? (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700">
                          <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          You rated {booking.review.rating}/5
                        </span>
                      ) : (
                        <button
                          onClick={() => openReviewModal(booking)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
                        >
                          <StarIcon className="h-3.5 w-3.5" /> Leave a Review
                        </button>
                      )
                    )}

                    {/* Decline / Cancel action */}
                    {booking.status !== "cancelled" && booking.status !== "completed" && (
                      <button
                        onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                        disabled={isPending}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        {userRole === "tutor" && booking.status === "pending" ? "Decline" : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leave a Review Modal */}
      <Modal
        open={!!reviewTarget}
        title={`Review ${reviewTarget?.tutor?.user.name ?? "your tutor"}`}
        onClose={() => setReviewTarget(null)}
      >
        {reviewTarget && (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">
              For your {reviewTarget.subject} session on {reviewTarget.date} (
              {reviewTarget.startTime}-{reviewTarget.endTime}).
            </p>

            {reviewError && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {reviewError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-0.5"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    <StarIcon
                      className={`h-7 w-7 ${
                        star <= reviewRating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-slate-100 text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your Review
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your learning experience with this tutor..."
                rows={3}
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
