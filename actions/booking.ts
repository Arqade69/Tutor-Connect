"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/notify";

// Full names of the days, in JS `Date.getDay()` order (0 = Sunday).
const JS_DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/** Derives the day-of-week name (e.g. "Monday") from a YYYY-MM-DD date string. */
function dayOfWeekFromDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return JS_DAY_NAMES[d.getDay()];
}

export type BookingSlotInput = {
  slotId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  date?: string; // YYYY-MM-DD for one-time
};

export type CreateBookingInput = {
  tutorId: string;
  bookingType?: "one_time" | "monthly";
  date?: string; // YYYY-MM-DD start date or single date
  selectedSlots?: BookingSlotInput[];
  // Fallback single slot compatibility:
  slotId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  subject: string;
  notes?: string;
};

// Helper: Monthly bookings remain active for 1 month (30 days window) from start date
function isWithinOneMonthWindow(startDateStr: string, targetDateStr: string): boolean {
  const start = new Date(startDateStr);
  const target = new Date(targetDateStr);

  if (isNaN(start.getTime()) || isNaN(target.getTime())) return true;

  const end = new Date(start);
  end.setDate(end.getDate() + 30); // 30-day (1 month) reservation window

  return target >= start && target <= end;
}

export async function createBooking(input: CreateBookingInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in to book a session." };
  }

  if (currentUser.role === "tutor") {
    return { error: "Tutors cannot book sessions with other tutors." };
  }

  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: input.tutorId },
    include: { user: true },
  });

  if (!tutor) {
    return { error: "Tutor profile not found." };
  }

  const type = input.bookingType ?? "one_time";
  const slots: BookingSlotInput[] =
    input.selectedSlots && input.selectedSlots.length > 0
      ? input.selectedSlots
      : input.startTime && input.endTime && input.dayOfWeek
      ? [
          {
            slotId: input.slotId,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
            date: input.date,
          },
        ]
      : [];

  if (slots.length === 0) {
    return { error: "Please select at least one time slot." };
  }

  const baseDate = input.date || new Date().toISOString().split("T")[0];

  // Fetch active bookings for this tutor to verify 1-month active duration conflicts
  const activeBookings = await prisma.booking.findMany({
    where: {
      tutorId: input.tutorId,
      status: { in: ["pending", "confirmed"] },
    },
  });

  for (const slot of slots) {
    const slotDate = slot.date || baseDate;
    const slotDay = slot.dayOfWeek;

    const conflict = activeBookings.find((b) => {
      if (b.startTime !== slot.startTime) return false;

      if (b.bookingType === "monthly") {
        // Monthly booking blocks slots ONLY during its 1-month active duration (30 days from b.date)
        const isCurrentlyActiveInMonth = isWithinOneMonthWindow(b.date, slotDate);
        const dayMatches = b.dayOfWeek.includes(slotDay);
        return isCurrentlyActiveInMonth && dayMatches;
      } else {
        // One-time booking conflict on exact date
        if (b.date === slotDate) return true;

        // If current request is monthly, check if one-time booking falls within requested monthly window
        if (type === "monthly" && b.dayOfWeek.includes(slotDay) && isWithinOneMonthWindow(slotDate, b.date)) {
          return true;
        }
      }
      return false;
    });

    if (conflict) {
      return {
        error: `Slot (${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}) is already booked for date ${slotDate} within the active monthly duration. Please select an available slot.`,
      };
    }
  }

  // Summarize slots into 1 single booking record
  const uniqueDays = Array.from(new Set(slots.map((s) => s.dayOfWeek))).join(", ");
  const summarizedTimes = slots.map((s) => `${s.startTime}-${s.endTime}`).join(", ");
  const slotSummary = slots.map((s) => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(" | ");

  const combinedNotes = input.notes?.trim()
    ? `${input.notes.trim()} (Slots: ${slotSummary})`
    : `Slots: ${slotSummary}`;

  const firstSlot = slots[0];

  // Create 1 single booking record for the monthly or one-time request
  const booking = await prisma.booking.create({
    data: {
      studentId: currentUser.id,
      tutorId: input.tutorId,
      slotId: firstSlot.slotId ?? null,
      date: baseDate,
      dayOfWeek: uniqueDays,
      startTime: firstSlot.startTime,
      endTime: slots.length > 1 ? summarizedTimes : firstSlot.endTime,
      subject: input.subject,
      notes: combinedNotes,
      bookingType: type,
      status: "pending",
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/tutors/${input.tutorId}`);

  const sessionLabel = `${input.subject} session on ${baseDate} (${firstSlot.startTime}-${firstSlot.endTime})`;

  // Booking confirmation — to the student/parent who just requested it.
  await notifyUser({
    userId: currentUser.id,
    email: currentUser.email,
    type: "booking_created",
    title: "Booking request sent",
    message: `We've sent your ${sessionLabel} request to ${tutor.user.name ?? "the tutor"}. You'll be notified as soon as they respond.`,
    metadata: { bookingId: booking.id },
  });

  // New booking alert — to the tutor who needs to act on it.
  await notifyUser({
    userId: tutor.userId,
    email: tutor.user.email,
    type: "new_booking_request",
    title: "New session request",
    message: `${currentUser.name ?? "A student"} requested a ${sessionLabel}. Review it in your bookings dashboard.`,
    metadata: { bookingId: booking.id },
  });

  return {
    success: true,
    count: 1,
    bookingId: booking.id,
  };
}

export async function getUserBookings() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  if (currentUser.role === "tutor") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: currentUser.id },
    });

    if (!tutorProfile) return [];

    return prisma.booking.findMany({
      where: { tutorId: tutorProfile.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            location: true,
            district: true,
            image: true,
          },
        },
        review: { select: { id: true, rating: true } },
      },
      // Clear, date-sorted view: soonest sessions/requests first, so a
      // tutor can scan upcoming demand at a glance rather than by the
      // order requests happened to come in.
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
  } else {
    // student or parent
    return prisma.booking.findMany({
      where: { studentId: currentUser.id },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                location: true,
                district: true,
                image: true,
              },
            },
          },
        },
        review: { select: { id: true, rating: true } },
      },
      orderBy: [{ createdAt: "desc" }, { date: "asc" }],
    });
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled" | "completed"
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Unauthorized" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tutor: { include: { user: true } }, student: true },
  });

  if (!booking) return { error: "Booking not found" };

  // Authorization check
  const isTutorOwner = booking.tutor.userId === currentUser.id;
  const isStudentOwner = booking.studentId === currentUser.id;
  const isAdmin = currentUser.role === "admin";

  if (!isTutorOwner && !isStudentOwner && !isAdmin) {
    return { error: "You do not have permission to update this booking." };
  }

  // Only the tutor (or an admin) can approve a request or mark a session as
  // done — a student/parent can request or cancel, but can't complete it
  // themselves, since completion is what unlocks leaving a review.
  if ((status === "confirmed" || status === "completed") && !isTutorOwner && !isAdmin) {
    return {
      error:
        status === "completed"
          ? "Only the tutor can mark a session as completed."
          : "Only the tutor can confirm a booking request.",
    };
  }

  if (status === "confirmed" && booking.status !== "pending") {
    return { error: "Only pending requests can be confirmed." };
  }

  if (status === "completed" && booking.status !== "confirmed") {
    return { error: "Only confirmed sessions can be marked as completed." };
  }

  if (status === "cancelled" && (booking.status === "completed" || booking.status === "cancelled")) {
    return { error: "This booking can no longer be cancelled." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status,
      // Any pending reschedule proposal is moot once the tutor or student
      // takes a direct action on the booking (confirm/cancel/complete).
      ...(booking.rescheduleStatus === "pending"
        ? {
            rescheduleStatus: "none",
            proposedDate: null,
            proposedDayOfWeek: null,
            proposedStartTime: null,
            proposedEndTime: null,
            rescheduleNote: null,
          }
        : {}),
    },
  });

  const sessionLabel = `${booking.subject} session on ${booking.date} (${booking.startTime}-${booking.endTime})`;

  // Notify the *other* party whenever the tutor takes the action; when a
  // student/parent cancels, let the tutor know instead.
  if (isTutorOwner || isAdmin) {
    if (status === "confirmed") {
      await notifyUser({
        userId: booking.student.id,
        email: booking.student.email,
        type: "booking_confirmed",
        title: "Your session request was approved",
        message: `${booking.tutor.user.name ?? "Your tutor"} approved your ${sessionLabel}.`,
        metadata: { bookingId: booking.id },
      });
    } else if (status === "cancelled") {
      await notifyUser({
        userId: booking.student.id,
        email: booking.student.email,
        type: "booking_cancelled",
        title: "A session was cancelled",
        message: `${booking.tutor.user.name ?? "Your tutor"} cancelled your ${sessionLabel}.`,
        metadata: { bookingId: booking.id },
      });
    } else if (status === "completed") {
      await notifyUser({
        userId: booking.student.id,
        email: booking.student.email,
        type: "booking_completed",
        title: "Session marked as completed",
        message: `Your ${sessionLabel} with ${booking.tutor.user.name ?? "your tutor"} was marked completed. You can now leave a review.`,
        metadata: { bookingId: booking.id },
      });
    }
  } else if (isStudentOwner && status === "cancelled") {
    await notifyUser({
      userId: booking.tutor.userId,
      email: booking.tutor.user.email,
      type: "booking_cancelled",
      title: "A student cancelled a session",
      message: `${booking.student.name ?? "A student"} cancelled the ${sessionLabel}.`,
      metadata: { bookingId: booking.id },
    });
  }

  revalidatePath("/dashboard/bookings");
  return { success: true };
}

// =====================================================================
//  Reschedule proposals — tutor proposes a new date/time for a booking,
//  the student/parent then accepts or declines it.
// =====================================================================

export type ProposeRescheduleInput = {
  bookingId: string;
  proposedDate: string; // YYYY-MM-DD
  proposedStartTime: string; // HH:mm
  proposedEndTime: string; // HH:mm
  note?: string;
};

export async function proposeReschedule(input: ProposeRescheduleInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Unauthorized" };

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { tutor: { include: { user: true } }, student: true },
  });
  if (!booking) return { error: "Booking not found" };

  if (booking.tutor.userId !== currentUser.id) {
    return { error: "Only the assigned tutor can propose a new time." };
  }
  if (booking.status === "cancelled" || booking.status === "completed") {
    return { error: "This session can no longer be rescheduled." };
  }
  if (!input.proposedDate || !input.proposedStartTime || !input.proposedEndTime) {
    return { error: "Please provide a new date and time." };
  }
  if (input.proposedStartTime >= input.proposedEndTime) {
    return { error: "End time must be after start time." };
  }

  const proposedDayOfWeek = dayOfWeekFromDate(input.proposedDate);

  await prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      rescheduleStatus: "pending",
      proposedDate: input.proposedDate,
      proposedDayOfWeek,
      proposedStartTime: input.proposedStartTime,
      proposedEndTime: input.proposedEndTime,
      rescheduleNote: input.note?.trim() || null,
    },
  });

  await notifyUser({
    userId: booking.student.id,
    email: booking.student.email,
    type: "booking_reschedule_proposed",
    title: "Your tutor proposed a new session time",
    message: `${booking.tutor.user.name ?? "Your tutor"} proposed moving your ${booking.subject} session to ${input.proposedDate} (${proposedDayOfWeek}) ${input.proposedStartTime}-${input.proposedEndTime}${
      input.note?.trim() ? ` — "${input.note.trim()}"` : ""
    }. Please accept or decline the new time.`,
    metadata: { bookingId: booking.id },
  });

  revalidatePath("/dashboard/bookings");
  return { success: true };
}

/** Tutor withdraws their own pending reschedule proposal. */
export async function cancelRescheduleProposal(bookingId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Unauthorized" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tutor: true },
  });
  if (!booking) return { error: "Booking not found" };
  if (booking.tutor.userId !== currentUser.id) {
    return { error: "Only the assigned tutor can withdraw this proposal." };
  }
  if (booking.rescheduleStatus !== "pending") {
    return { error: "There is no pending proposal to withdraw." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      rescheduleStatus: "none",
      proposedDate: null,
      proposedDayOfWeek: null,
      proposedStartTime: null,
      proposedEndTime: null,
      rescheduleNote: null,
    },
  });

  revalidatePath("/dashboard/bookings");
  return { success: true };
}

/** Student/parent accepts or declines a tutor's reschedule proposal. */
export async function respondToReschedule(bookingId: string, accept: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Unauthorized" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tutor: { include: { user: true } }, student: true },
  });
  if (!booking) return { error: "Booking not found" };
  if (booking.studentId !== currentUser.id) {
    return { error: "Only the student who booked this session can respond." };
  }
  if (booking.rescheduleStatus !== "pending") {
    return { error: "There is no pending reschedule proposal for this session." };
  }

  if (accept) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        date: booking.proposedDate!,
        dayOfWeek: booking.proposedDayOfWeek!,
        startTime: booking.proposedStartTime!,
        endTime: booking.proposedEndTime!,
        status: "confirmed",
        rescheduleStatus: "none",
        proposedDate: null,
        proposedDayOfWeek: null,
        proposedStartTime: null,
        proposedEndTime: null,
        rescheduleNote: null,
        // The session time changed, so reset reminder tracking — otherwise
        // the 24h/1h reminders could silently fail to fire for the new time.
        reminder24SentForDate: null,
        reminder1SentForDate: null,
      },
    });

    await notifyUser({
      userId: booking.tutor.userId,
      email: booking.tutor.user.email,
      type: "booking_reschedule_accepted",
      title: "Student accepted the new session time",
      message: `${booking.student.name ?? "Your student"} accepted the new time for the ${booking.subject} session: ${booking.proposedDate} (${booking.proposedDayOfWeek}) ${booking.proposedStartTime}-${booking.proposedEndTime}.`,
      metadata: { bookingId: booking.id },
    });
  } else {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        rescheduleStatus: "none",
        proposedDate: null,
        proposedDayOfWeek: null,
        proposedStartTime: null,
        proposedEndTime: null,
        rescheduleNote: null,
      },
    });

    await notifyUser({
      userId: booking.tutor.userId,
      email: booking.tutor.user.email,
      type: "booking_reschedule_declined",
      title: "Student declined the proposed time",
      message: `${booking.student.name ?? "Your student"} declined the new time you proposed for the ${booking.subject} session. The original time (${booking.date} ${booking.startTime}-${booking.endTime}) still stands — propose another time or take action on the original request.`,
      metadata: { bookingId: booking.id },
    });
  }

  revalidatePath("/dashboard/bookings");
  return { success: true };
}
