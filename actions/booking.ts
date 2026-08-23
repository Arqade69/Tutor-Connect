"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { awardRewardPoints } from "./rewards";

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

  // Award reward points to Premium users for booking a session
  await awardRewardPoints(
    currentUser.id,
    "booking_created",
    `Booked a ${type} session for ${input.subject}`
  );

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
      orderBy: [{ createdAt: "desc" }, { date: "asc" }],
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
    include: { tutor: true },
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
    data: { status },
  });

  // Award reward points when a session is marked as completed
  if (status === "completed") {
    await awardRewardPoints(
      booking.studentId,
      "session_completed",
      `Completed a tutoring session`
    );
  }

  revalidatePath("/dashboard/bookings");
  return { success: true };
}
