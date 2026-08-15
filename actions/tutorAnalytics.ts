"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type AnalyticsFilterInput = {
  startDate?: string;
  endDate?: string;
};

export type MonthlyMetric = {
  key: string;       // YYYY-MM
  label: string;     // MMM YYYY (e.g. "Jan 2026")
  sessions: number;
  earnings: number;
};

export type YearlyMetric = {
  key: string;       // YYYY
  label: string;     // YYYY
  sessions: number;
  earnings: number;
};

export type RatingTrendMetric = {
  key: string;       // YYYY-MM
  label: string;     // MMM YYYY
  averageRating: number;
  reviewCount: number;
  totalStars: number;
};

export type DayDemandMetric = {
  dayOfWeek: string;
  count: number;
  percentage: number;
};

// Deliberately excludes anything that could identify the reviewer (name,
// email, image, authorId, bookingId). Tutors can see what students say
// about them, but not who said it — see getTutorAnalyticsData below, where
// the Prisma query itself is scoped to these fields only.
export type AnonymizedReviewDetail = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string; // ISO string
  subject: string | null;
};

export type TimeSlotDemandMetric = {
  timeSlot: string;
  count: number;
};

export type CompletedSessionDetail = {
  id: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  bookingType: string;
  studentName: string;
  studentEmail: string;
  durationHours: number;
  fee: number;
};

export type TutorAnalyticsResult = {
  error?: string;
  verificationStatus?: string;
  isVerified?: boolean;
  hourlyFee?: number;

  summary?: {
    totalEarnings: number;
    totalCompletedSessions: number;
    totalConfirmedSessions: number;
    totalPendingSessions: number;
    averageRating: number; // totalStars / totalReviews
    totalReviews: number;
    totalStars: number;
  };

  peakDemand?: {
    topDay: string;
    topDayCount: number;
    topTimeSlot: string;
    topTimeSlotCount: number;
    peakMonth: string;
    peakMonthCount: number;
    daysBreakdown: DayDemandMetric[];
    timeSlotsBreakdown: TimeSlotDemandMetric[];
  };

  monthlyMetrics?: MonthlyMetric[];
  yearlyMetrics?: YearlyMetric[];
  ratingTrends?: RatingTrendMetric[];
  recentCompletedSessions?: CompletedSessionDetail[];
  // Anonymous — see AnonymizedReviewDetail.
  reviews?: AnonymizedReviewDetail[];
};

/** Helper function to parse session duration in hours from startTime & endTime strings */
function calculateSessionHours(startTime: string, endTime: string): number {
  try {
    if (!startTime || !endTime) return 1.5;

    // Handle range summaries if any (e.g. "16:00-17:00, 18:00-19:00")
    if (endTime.includes(",")) {
      const parts = endTime.split(",").map((p) => p.trim());
      let total = 0;
      for (const part of parts) {
        const [s, e] = part.split("-");
        if (s && e) {
          total += calculateSessionHours(s, e);
        }
      }
      return total > 0 ? total : 1.5;
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    if (isNaN(sh) || isNaN(eh)) return 1.5;

    const startMinutes = sh * 60 + (sm || 0);
    const endMinutes = eh * 60 + (em || 0);

    const diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) return 1.5;

    return Math.round((diffMinutes / 60) * 10) / 10;
  } catch {
    return 1.5;
  }
}

export async function getTutorAnalyticsData(
  filters?: AnalyticsFilterInput
): Promise<TutorAnalyticsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  if (user.role !== "tutor") {
    return { error: "Only tutor accounts can access tutor performance analytics." };
  }

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return { error: "Tutor profile not found. Please create your tutor profile first." };
  }

  const isVerified = profile.verificationStatus === "approved";
  const hourlyFee = profile.hourlyFee || 500;

  if (!isVerified) {
    return {
      isVerified: false,
      verificationStatus: profile.verificationStatus,
      hourlyFee,
      summary: {
        totalEarnings: 0,
        totalCompletedSessions: 0,
        totalConfirmedSessions: 0,
        totalPendingSessions: 0,
        averageRating: 0,
        totalReviews: 0,
        totalStars: 0,
      },
    };
  }

  // Build Date filters
  const bookingDateWhere: Record<string, unknown> = {
    tutorId: profile.id,
  };

  if (filters?.startDate || filters?.endDate) {
    const dateObj: Record<string, string> = {};
    if (filters.startDate) dateObj.gte = filters.startDate;
    if (filters.endDate) dateObj.lte = filters.endDate;
    bookingDateWhere.date = dateObj;
  }

  // Fetch all bookings for this tutor matching date filter
  const allBookings = await prisma.booking.findMany({
    where: bookingDateWhere,
    include: {
      student: {
        select: { name: true, email: true },
      },
    },
    orderBy: { date: "desc" },
  });

  // Fetch all reviews for this tutor
  const reviewDateWhere: Record<string, unknown> = {
    tutorId: profile.id,
  };

  if (filters?.startDate || filters?.endDate) {
    const createdObj: Record<string, Date> = {};
    if (filters.startDate) createdObj.gte = new Date(`${filters.startDate}T00:00:00Z`);
    if (filters.endDate) createdObj.lte = new Date(`${filters.endDate}T23:59:59Z`);
    reviewDateWhere.createdAt = createdObj;
  }

  // NOTE: this is scoped with `select` on purpose — it intentionally never
  // fetches authorId or the author relation. Reviews are shown to the tutor
  // anonymously, so the identifying fields shouldn't even reach this
  // function, let alone the client.
  const allReviews = await prisma.review.findMany({
    where: reviewDateWhere,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      booking: { select: { subject: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // 1. Summaries
  const completedBookings = allBookings.filter((b) => b.status === "completed");
  const confirmedBookings = allBookings.filter((b) => b.status === "confirmed");
  const pendingBookings = allBookings.filter((b) => b.status === "pending");

  let totalEarnings = 0;
  const completedSessionDetails: CompletedSessionDetail[] = [];

  for (const b of completedBookings) {
    const hours = calculateSessionHours(b.startTime, b.endTime);
    const fee = Math.round(hours * hourlyFee);
    totalEarnings += fee;

    completedSessionDetails.push({
      id: b.id,
      date: b.date,
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      subject: b.subject,
      bookingType: b.bookingType,
      studentName: b.student.name || "Student",
      studentEmail: b.student.email,
      durationHours: hours,
      fee,
    });
  }

  // Ratings calculation: average = totalStars / totalReviews
  const totalReviews = allReviews.length;
  const totalStars = allReviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalReviews > 0 ? Math.round((totalStars / totalReviews) * 10) / 10 : 0;

  // 2. Monthly & Yearly Aggregation for completed sessions
  const monthlyMap: Record<string, { sessions: number; earnings: number }> = {};
  const yearlyMap: Record<string, { sessions: number; earnings: number }> = {};

  for (const session of completedSessionDetails) {
    const yearMonth = session.date.substring(0, 7); // YYYY-MM
    const year = session.date.substring(0, 4);       // YYYY

    if (!monthlyMap[yearMonth]) {
      monthlyMap[yearMonth] = { sessions: 0, earnings: 0 };
    }
    monthlyMap[yearMonth].sessions += 1;
    monthlyMap[yearMonth].earnings += session.fee;

    if (!yearlyMap[year]) {
      yearlyMap[year] = { sessions: 0, earnings: 0 };
    }
    yearlyMap[year].sessions += 1;
    yearlyMap[year].earnings += session.fee;
  }

  // Convert monthlyMap to sorted array
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyMetrics: MonthlyMetric[] = Object.keys(monthlyMap)
    .sort()
    .map((ym) => {
      const [y, m] = ym.split("-");
      const monthIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[monthIdx]} ${y}`;
      return {
        key: ym,
        label,
        sessions: monthlyMap[ym].sessions,
        earnings: monthlyMap[ym].earnings,
      };
    });

  const yearlyMetrics: YearlyMetric[] = Object.keys(yearlyMap)
    .sort()
    .map((y) => ({
      key: y,
      label: y,
      sessions: yearlyMap[y].sessions,
      earnings: yearlyMap[y].earnings,
    }));

  // 3. Rating Trends Over Time
  // Group reviews by YYYY-MM
  const ratingTrendMap: Record<string, { stars: number; count: number }> = {};
  let runningStars = 0;
  let runningCount = 0;

  for (const rev of allReviews) {
    const ym = rev.createdAt.toISOString().substring(0, 7);
    runningStars += rev.rating;
    runningCount += 1;

    ratingTrendMap[ym] = {
      stars: runningStars,
      count: runningCount,
    };
  }

  const ratingTrends: RatingTrendMetric[] = Object.keys(ratingTrendMap)
    .sort()
    .map((ym) => {
      const [y, m] = ym.split("-");
      const monthIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[monthIdx]} ${y}`;
      const data = ratingTrendMap[ym];
      const avg = Math.round((data.stars / data.count) * 10) / 10;
      return {
        key: ym,
        label,
        averageRating: avg,
        reviewCount: data.count,
        totalStars: data.stars,
      };
    });

  // 4. Peak Demand Analysis (Day of week & time slots across all sessions/bookings)
  const dayCountMap: Record<string, number> = {
    Saturday: 0,
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
  };
  const timeSlotCountMap: Record<string, number> = {};
  const monthDemandMap: Record<string, number> = {};

  const totalDemandSessions = allBookings.length;

  for (const b of allBookings) {
    // Day of week
    if (b.dayOfWeek) {
      const days = b.dayOfWeek.split(",").map((d) => d.trim());
      for (const d of days) {
        if (dayCountMap[d] !== undefined) {
          dayCountMap[d] += 1;
        }
      }
    }

    // Time slot
    if (b.startTime) {
      const slotStr = `${b.startTime} - ${b.endTime}`;
      timeSlotCountMap[slotStr] = (timeSlotCountMap[slotStr] || 0) + 1;
    }

    // Month
    if (b.date) {
      const ym = b.date.substring(0, 7);
      monthDemandMap[ym] = (monthDemandMap[ym] || 0) + 1;
    }
  }

  // Determine Top Day
  let topDay = "Saturday";
  let topDayCount = 0;
  for (const [day, count] of Object.entries(dayCountMap)) {
    if (count > topDayCount) {
      topDayCount = count;
      topDay = day;
    }
  }

  // Determine Top Time Slot
  let topTimeSlot = "16:00 - 18:00";
  let topTimeSlotCount = 0;
  for (const [slot, count] of Object.entries(timeSlotCountMap)) {
    if (count > topTimeSlotCount) {
      topTimeSlotCount = count;
      topTimeSlot = slot;
    }
  }

  // Determine Peak Month
  let peakMonth = "N/A";
  let peakMonthCount = 0;
  for (const [ym, count] of Object.entries(monthDemandMap)) {
    if (count > peakMonthCount) {
      peakMonthCount = count;
      const [y, m] = ym.split("-");
      const monthIdx = parseInt(m, 10) - 1;
      peakMonth = `${monthNames[monthIdx]} ${y}`;
    }
  }

  const daysBreakdown: DayDemandMetric[] = Object.entries(dayCountMap).map(([day, count]) => ({
    dayOfWeek: day,
    count,
    percentage: totalDemandSessions > 0 ? Math.round((count / totalDemandSessions) * 100) : 0,
  }));

  const timeSlotsBreakdown: TimeSlotDemandMetric[] = Object.entries(timeSlotCountMap)
    .map(([slot, count]) => ({ timeSlot: slot, count }))
    .sort((a, b) => b.count - a.count);

  // 5. Anonymized review feed — rating + comment only, newest first. No
  // author name/email/image/id is included anywhere in this mapping.
  const reviews: AnonymizedReviewDetail[] = [...allReviews]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      subject: r.booking?.subject ?? null,
    }));

  return {
    isVerified: true,
    verificationStatus: profile.verificationStatus,
    hourlyFee,
    summary: {
      totalEarnings,
      totalCompletedSessions: completedBookings.length,
      totalConfirmedSessions: confirmedBookings.length,
      totalPendingSessions: pendingBookings.length,
      averageRating,
      totalReviews,
      totalStars,
    },
    peakDemand: {
      topDay,
      topDayCount,
      topTimeSlot,
      topTimeSlotCount,
      peakMonth,
      peakMonthCount,
      daysBreakdown,
      timeSlotsBreakdown,
    },
    monthlyMetrics,
    yearlyMetrics,
    ratingTrends,
    recentCompletedSessions: completedSessionDetails.slice(0, 10),
    reviews,
  };
}
