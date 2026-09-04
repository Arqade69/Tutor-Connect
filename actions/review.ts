"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { awardRewardPoints } from "./rewards";

// A student/parent can only review a tutor once per completed session — the
// review is created against a specific Booking, not just the tutor, so the
// tutorId/authorId are always derived from that booking rather than trusted
// client input.
export async function createReview(bookingId: string, rating: number, comment: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You must be logged in to leave a review." };

  if (currentUser.role === "tutor") {
    return { error: "Tutors cannot review other tutors." };
  }

  // Snap to the nearest half-star (e.g. 4.3 -> 4.5, 4.2 -> 4.0) so the
  // stored rating always matches what the half-star UI can produce.
  const ratingValue = Math.round(rating * 2) / 2;
  if (!ratingValue || ratingValue < 0.5 || ratingValue > 5) {
    return { error: "Please select a rating between half a star and 5 stars." };
  }

  if (!comment || !comment.trim()) {
    return { error: "Please write a comment for your review." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { review: true },
  });

  if (!booking) return { error: "Booking not found." };

  if (booking.studentId !== currentUser.id) {
    return { error: "You can only review sessions you booked yourself." };
  }

  if (booking.status !== "completed") {
    return { error: "You can only leave a review after the tutor marks this session as completed." };
  }

  if (booking.review) {
    return { error: "You've already left a review for this session." };
  }

  try {
    const review = await prisma.review.create({
      data: {
        tutorId: booking.tutorId,
        authorId: currentUser.id,
        bookingId: booking.id,
        rating: ratingValue,
        comment: comment.trim(),
      },
    });

    revalidatePath(`/dashboard/tutors/${booking.tutorId}`);
    revalidatePath("/dashboard/tutors");
    revalidatePath("/dashboard/bookings");

    // Award reward points for writing a review
    await awardRewardPoints(
      currentUser.id,
      "review_written",
      `Wrote a ${ratingValue}-star review`
    );

    return { success: true, reviewId: review.id };
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { error: "You've already left a review for this session." };
    }
    throw err;
  }
}

// Completed sessions this user had with a tutor that don't have a review yet
export async function getReviewableBookings(tutorId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === "tutor") return [];

  return prisma.booking.findMany({
    where: {
      tutorId,
      studentId: currentUser.id,
      status: "completed",
      review: null,
    },
    select: {
      id: true,
      date: true,
      subject: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { date: "desc" },
  });
}
