"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBooking } from "@/actions/booking";
import { createReview } from "@/actions/review";
import { getOrCreateConversation } from "@/actions/chat";
import {
  StarIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon,
  ChatIcon,
  CheckCircleIcon,
  SparklesIcon,
  BookIcon,
} from "@/components/icons";

type TutorData = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  image?: string | null;
  location: string;
  district: string;
  tagline?: string | null;
  bio?: string | null;
  subjects: string[];
  classLevels: string[];
  medium: string;
  hourlyFee: number;
  verificationStatus: string;
  rating: number;
  reviewCount: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: Date;
    authorName: string;
    authorRole: string;
    authorImage?: string | null;
  }>;
  availabilitySlots: Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isBooked: boolean;
  }>;
  activeBookings: Array<{
    date: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    slotId?: string | null;
    bookingType?: string;
  }>;
};

type SlotItem = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

// A completed-but-not-yet-reviewed session the current user had with this
// tutor — reviews are tied to one of these, not just left "on the tutor".
type ReviewableBooking = {
  id: string;
  date: string;
  subject: string;
  startTime: string;
  endTime: string;
};

export function TutorProfileClient({
  tutor,
  currentUserRole,
  reviewableBookings,
}: {
  tutor: TutorData;
  currentUserRole?: string;
  reviewableBookings: ReviewableBooking[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Booking mode & selection state
  const todayStr = new Date().toISOString().split("T")[0];
  const [bookingType, setBookingType] = useState<"one_time" | "monthly">("one_time");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlots, setSelectedSlots] = useState<SlotItem[]>([]);
  const [subject, setSubject] = useState<string>(tutor.subjects[0] ?? "Physics");
  const [notes, setNotes] = useState<string>("");
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Review state
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    reviewableBookings[0]?.id ?? ""
  );

  // Keep the selected session in sync as the reviewable list changes
  // (e.g. after a successful submission removes the one just reviewed).
  useEffect(() => {
    if (!reviewableBookings.some((b) => b.id === selectedBookingId)) {
      setSelectedBookingId(reviewableBookings[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewableBookings]);

  // Calculate day of week for selected date
  const getDayOfWeekName = (dateString: string) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date(dateString);
    return days[d.getDay()];
  };

  const selectedDayName = getDayOfWeekName(selectedDate);

  // Filter slots for One-Time session (specific day of week)
  const daySlots = tutor.availabilitySlots.filter((s) => s.dayOfWeek === selectedDayName);

  // Group slots by Day of Week for Monthly Session
  const DAYS_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const groupedMonthlySlots = DAYS_ORDER.map((day) => ({
    dayOfWeek: day,
    slots: tutor.availabilitySlots.filter((s) => s.dayOfWeek === day),
  })).filter((group) => group.slots.length > 0);

  // Helper: Monthly bookings remain active for 1 month (30 days window) from start date
  const isWithinOneMonthWindow = (startDateStr: string, targetDateStr: string) => {
    const start = new Date(startDateStr);
    const target = new Date(targetDateStr);

    if (isNaN(start.getTime()) || isNaN(target.getTime())) return true;

    const end = new Date(start);
    end.setDate(end.getDate() + 30); // 1 month window (30 days)

    return target >= start && target <= end;
  };

  // Comprehensive check: Slot is booked during its 1-month active duration
  const isSlotBooked = (slot: SlotItem, date: string) => {
    const targetDay = getDayOfWeekName(date);

    return tutor.activeBookings.some((b) => {
      // Check if start time matches
      if (b.startTime !== slot.startTime) return false;

      if (b.bookingType === "monthly") {
        // Monthly booking blocks slots ONLY during its 1-month active duration (30 days from b.date)
        const isCurrentlyActiveInMonth = isWithinOneMonthWindow(b.date, date);
        const dayMatches = b.dayOfWeek.includes(slot.dayOfWeek) || b.dayOfWeek.includes(targetDay);
        return isCurrentlyActiveInMonth && dayMatches;
      } else {
        // One-time booking conflict on exact date
        if (b.date === date) return true;

        // If checking in monthly mode, one-time booking blocks if date is within target month window
        if (bookingType === "monthly" && b.dayOfWeek.includes(slot.dayOfWeek) && isWithinOneMonthWindow(date, b.date)) {
          return true;
        }
      }

      return false;
    });
  };

  // Toggle slot selection (multi-select)
  const toggleSlotSelection = (slot: SlotItem) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      if (exists) {
        return prev.filter((s) => s.id !== slot.id);
      } else {
        return [...prev, slot];
      }
    });
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) {
      setBookingError("Please select at least one time slot.");
      return;
    }

    setBookingError(null);
    startTransition(async () => {
      const res = await createBooking({
        tutorId: tutor.id,
        bookingType,
        date: selectedDate,
        selectedSlots: selectedSlots.map((s) => ({
          slotId: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          date: selectedDate,
        })),
        subject,
        notes,
      });

      if (res.error) {
        setBookingError(res.error);
      } else {
        setBookingSuccess(true);
        setBookingCount(res.count ?? 1);
        setSelectedSlots([]);
        setNotes("");
        router.refresh();
      }
    });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewMsg(null);

    if (!selectedBookingId) {
      setReviewMsg("Error: Select which completed session you're reviewing.");
      return;
    }

    startTransition(async () => {
      const res = await createReview(selectedBookingId, newRating, newComment);
      if (res.error) {
        setReviewMsg(`Error: ${res.error}`);
      } else {
        setReviewMsg("Thank you! Your review has been submitted.");
        setNewComment("");
        router.refresh();
      }
    });
  };

  const handleOpenChat = async () => {
    startTransition(async () => {
      const res = await getOrCreateConversation(tutor.userId);
      if (res.conversationId) {
        router.push(`/dashboard/chat?convId=${res.conversationId}`);
      }
    });
  };

  // Estimated Fee calculation
  const totalSlotsCount = selectedSlots.length;
  const estimatedCost =
    bookingType === "one_time"
      ? totalSlotsCount * tutor.hourlyFee
      : totalSlotsCount * 4 * tutor.hourlyFee; // ~4 weeks per month

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/tutors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
        >
          ← Back to Tutor Search
        </Link>
      </div>

      {/* Tutor Profile Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            {tutor.image ? (
              <img
                src={tutor.image}
                alt={tutor.name}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-brand-100"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white ring-4 ring-brand-100">
                {tutor.name[0]?.toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{tutor.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  <SparklesIcon className="h-3.5 w-3.5 text-brand-600" /> Verified Educator
                </span>
              </div>

              <p className="text-sm font-medium text-slate-600">{tutor.tagline}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <StarIcon className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {tutor.rating} ({tutor.reviewCount} reviews)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4 text-slate-400" />
                  {tutor.location}, {tutor.district}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700">Medium: {tutor.medium}</span>
              </div>
            </div>
          </div>

          {/* Pricing & Chat Action */}
          <div className="flex flex-col items-start gap-3 border-t border-slate-100 pt-4 md:items-end md:border-t-0 md:pt-0">
            <div className="text-left md:text-right">
              <span className="text-2xl font-extrabold text-brand-700">৳{tutor.hourlyFee}</span>
              <span className="text-xs text-slate-500"> / hour</span>
            </div>

            <button
              onClick={handleOpenChat}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-800"
            >
              <ChatIcon className="h-4 w-4" />
              Chat with Tutor
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Session Booking Widget */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Profile Details & Reviews */}
        <div className="space-y-6 lg:col-span-2">
          {/* About Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">About the Tutor</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
              {tutor.bio ?? "No detailed biography provided yet."}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Subjects Taught
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tutor.subjects.map((sub) => (
                    <span
                      key={sub}
                      className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Class Levels Covered
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tutor.classLevels.map((cl) => (
                    <span
                      key={cl}
                      className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                    >
                      {cl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Student Reviews & Ratings */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Student & Parent Reviews</h2>
                <p className="text-xs text-slate-500">
                  Rated {tutor.rating} out of 5 based on {tutor.reviewCount} reviews
                </p>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-amber-500 text-lg">
                <StarIcon className="h-6 w-6 fill-amber-400 text-amber-400" />
                {tutor.rating}
              </div>
            </div>

            {/* Leave a review (students/parents only, and only once a session
                with this tutor has been marked Completed) */}
            {currentUserRole && currentUserRole !== "tutor" && (
              reviewableBookings.length > 0 ? (
                <form onSubmit={handleReviewSubmit} className="rounded-xl bg-slate-50 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Write a Review
                  </h3>
                  {reviewMsg && (
                    <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                      {reviewMsg}
                    </div>
                  )}

                  {reviewableBookings.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-medium">
                        Which completed session is this for?
                      </label>
                      <select
                        value={selectedBookingId}
                        onChange={(e) => setSelectedBookingId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        {reviewableBookings.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.subject} — {b.date} ({b.startTime}-{b.endTime})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 font-medium">Rating:</label>
                    <select
                      value={newRating}
                      onChange={(e) => setNewRating(Number(e.target.value))}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                    >
                      <option value={5}>5 Stars (Excellent)</option>
                      <option value={4}>4 Stars (Good)</option>
                      <option value={3}>3 Stars (Average)</option>
                      <option value={2}>2 Stars (Poor)</option>
                      <option value={1}>1 Star (Terrible)</option>
                    </select>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your learning experience with this tutor..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                  You'll be able to leave a review here once a tutoring session with{" "}
                  {tutor.name} has been marked <span className="font-semibold">Completed</span>.
                  Check your{" "}
                  <Link href="/dashboard/bookings" className="font-semibold text-brand-600 hover:underline">
                    bookings
                  </Link>{" "}
                  for status updates.
                </div>
              )
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {tutor.reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No reviews yet for this tutor.</p>
              ) : (
                tutor.reviews.map((rev) => (
                  <div key={rev.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                          {rev.authorName[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{rev.authorName}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                        <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {rev.rating}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Interactive Session Booking Widget */}
        <div className="space-y-6 lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CalendarIcon className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Book Session</h2>
            </div>

            {/* Session Type Tabs: One-Time / Temporary vs Monthly */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setBookingType("one_time");
                  setSelectedSlots([]);
                  setBookingSuccess(false);
                }}
                className={`rounded-lg py-2 transition text-center ${
                  bookingType === "one_time"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ One-Time / Single
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingType("monthly");
                  setSelectedSlots([]);
                  setBookingSuccess(false);
                }}
                className={`rounded-lg py-2 transition text-center ${
                  bookingType === "monthly"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📅 Monthly Session
              </button>
            </div>

            {bookingSuccess && (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600" /> Booking Submitted!
                </div>
                <p className="text-xs leading-relaxed">
                  Your {bookingType === "monthly" ? "monthly package (1-month reservation)" : "one-time"} booking request has been submitted. Track approval in your Bookings page.
                </p>
                <Link
                  href="/dashboard/bookings"
                  className="inline-block text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                >
                  View My Bookings →
                </Link>
              </div>
            )}

            {bookingError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {bookingError}
              </div>
            )}

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {bookingType === "one_time" ? "Select Session Date" : "Select Monthly Start Date"}
              </label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlots([]);
                  setBookingSuccess(false);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500">
                Starting Day: <span className="font-semibold text-slate-800">{selectedDayName}</span>
              </p>
            </div>

            {/* Time Slot Picker (Multi-Slot Selection) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {bookingType === "one_time"
                    ? `Available Slots for ${selectedDayName}`
                    : "Select Weekly Recurring Slots"}
                </label>
                {selectedSlots.length > 0 && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-extrabold text-brand-800">
                    {selectedSlots.length} Selected
                  </span>
                )}
              </div>

              {bookingType === "one_time" ? (
                /* One time slots for specific day */
                daySlots.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">
                    No availability slots for {selectedDayName}s. Please choose another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {daySlots.map((slot) => {
                      const booked = isSlotBooked(slot, selectedDate);
                      const isSelected = selectedSlots.some((s) => s.id === slot.id);

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={booked}
                          onClick={() => toggleSlotSelection(slot)}
                          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition border ${
                            booked
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75"
                              : isSelected
                              ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-slate-400" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                          {booked ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 uppercase">
                              Booked / Reserved
                            </span>
                          ) : isSelected ? (
                            <span className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              ✓ Selected
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase">
                              + Select
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Monthly slots grouped by day of week */
                groupedMonthlySlots.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">
                    This tutor has no weekly availability slots set up.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {groupedMonthlySlots.map((group) => (
                      <div key={group.dayOfWeek} className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                          {group.dayOfWeek}s
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {group.slots.map((slot) => {
                            const booked = isSlotBooked(slot, selectedDate);
                            const isSelected = selectedSlots.some((s) => s.id === slot.id);

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={booked}
                                onClick={() => toggleSlotSelection(slot)}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                                  booked
                                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75"
                                    : isSelected
                                    ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {booked ? (
                                  <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 uppercase">
                                    Booked / Reserved
                                  </span>
                                ) : isSelected ? (
                                  <span className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                    ✓ Selected
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-brand-600 font-bold uppercase">
                                    + Add Slot
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Estimated Price & Booking Form */}
            {selectedSlots.length > 0 && (
              <form onSubmit={handleBookingSubmit} className="space-y-4 border-t border-slate-100 pt-4">
                <div className="rounded-xl bg-slate-50 p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {selectedSlots.length} slot(s) selected
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {bookingType === "monthly" ? "1 Month Package (~4 weeks)" : "Single session"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-brand-700">৳{estimatedCost}</span>
                    <span className="block text-[10px] text-slate-400">Est. Total Fee</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Subject / Topic
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    {tutor.subjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Notes for Tutor (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mention specific learning goals or syllabus..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 shadow-md disabled:opacity-50"
                >
                  {isPending
                    ? "Processing..."
                    : bookingType === "monthly"
                    ? `Confirm 1-Month Package (${selectedSlots.length} Slots)`
                    : `Confirm Booking (${selectedSlots.length} Slots)`}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
