"use server";

import { prisma } from "@/lib/prisma";
import { guard, clean, requireRole, revalidatePath } from "./_shared";

async function getTarget(id: string, adminId: string) {
  if (!id) throw new Error("User id is required.");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("User not found.");
  if (target.id === adminId) throw new Error("You cannot perform this action on your own account.");
  if (target.role === "admin") throw new Error("Admin accounts cannot be modified by other admins here.");
  return target;
}

/** Toggle a user's Premium subscription (admin only). */
export async function adminTogglePremium(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    await prisma.user.update({
      where: { id: target.id },
      data: { isPremium: !target.isPremium },
    });
    revalidatePath("/dashboard/admin");
  });
}

/** Change a user's role between student and parent (admin only). */
export async function adminChangeRole(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    const role = clean(formData.get("role"));
    if (role !== "student" && role !== "parent") throw new Error("Invalid role.");
    await prisma.user.update({ where: { id: target.id }, data: { role } });
    revalidatePath("/dashboard/admin");
  });
}

/** Suspend or reactivate a user (admin only). */
export async function adminToggleStatus(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    const next = target.status === "suspended" ? "active" : "suspended";
    await prisma.user.update({ where: { id: target.id }, data: { status: next } });
    revalidatePath("/dashboard/admin");
  });
}

/** Permanently delete a user (admin only). */
export async function adminDeleteUser(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    await prisma.user.delete({ where: { id: target.id } });
    revalidatePath("/dashboard/admin");
  });
}

/** Verify / approve / reject a tutor registration profile (admin only). */
export async function adminVerifyTutor(formData: FormData) {
  return guard(async () => {
    await requireRole("admin");
    const tutorProfileId = clean(formData.get("tutorProfileId"));
    const status = clean(formData.get("status"));

    if (!tutorProfileId) throw new Error("Tutor profile ID is required.");
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      throw new Error("Invalid verification status.");
    }

    await prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { verificationStatus: status },
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/tutor");
  });
}

/** Flag or unflag a user account for policy violations (admin only). */
export async function adminToggleFlag(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    const flagReason = clean(formData.get("flagReason")) || null;
    const isFlagged = target.isFlagged;

    await prisma.user.update({
      where: { id: target.id },
      data: {
        isFlagged: !isFlagged,
        flagReason: !isFlagged ? flagReason || "Flagged by Admin for policy review" : null,
      },
    });

    revalidatePath("/dashboard/admin");
  });
}

/** Update platform reward point conversion rates and subscription pricing (admin only). */
export async function adminUpdateSystemSettings(formData: FormData) {
  return guard(async () => {
    await requireRole("admin");
    const rewardPointRate = parseFloat(clean(formData.get("rewardPointRate")) || "1.0");
    const rewardPointsPerBooking = parseInt(clean(formData.get("rewardPointsPerBooking")) || "10", 10);
    const premiumMonthlyPrice = parseInt(clean(formData.get("premiumMonthlyPrice")) || "499", 10);
    const premiumAnnualPrice = parseInt(clean(formData.get("premiumAnnualPrice")) || "4499", 10);
    const platformCommissionRate = parseFloat(clean(formData.get("platformCommissionRate")) || "10.0");

    if (isNaN(rewardPointRate) || rewardPointRate < 0) throw new Error("Invalid reward point rate.");
    if (isNaN(rewardPointsPerBooking) || rewardPointsPerBooking < 0) throw new Error("Invalid reward points per booking.");
    if (isNaN(premiumMonthlyPrice) || premiumMonthlyPrice < 0) throw new Error("Invalid monthly subscription price.");
    if (isNaN(premiumAnnualPrice) || premiumAnnualPrice < 0) throw new Error("Invalid annual subscription price.");
    if (isNaN(platformCommissionRate) || platformCommissionRate < 0 || platformCommissionRate > 100) {
      throw new Error("Invalid platform commission rate.");
    }

    await prisma.systemSetting.upsert({
      where: { id: "default" },
      update: {
        rewardPointRate,
        rewardPointsPerBooking,
        premiumMonthlyPrice,
        premiumAnnualPrice,
        platformCommissionRate,
      },
      create: {
        id: "default",
        rewardPointRate,
        rewardPointsPerBooking,
        premiumMonthlyPrice,
        premiumAnnualPrice,
        platformCommissionRate,
      },
    });

    revalidatePath("/dashboard/admin");
  });
}

export type MonthlyBookingStat = {
  monthKey: string; // e.g. "2026-03"
  label: string;    // e.g. "Mar 2026"
  totalBookings: number;
  completedBookings: number;
};

export type MonthlyRevenueStat = {
  monthKey: string;
  label: string;
  subscriptionRevenue: number;
  paymentCount: number;
};

export type SystemMonitoringHealth = {
  dbConnected: boolean;
  dbLatencyMs: number;
  totalUsers: number;
  totalBookings: number;
  totalTutorProfiles: number;
  totalReviews: number;
  totalMessages: number;
  totalBotMessages: number;
  lastHealthCheck: string;
};

/** Get aggregated Admin Analytics & System Monitoring data */
export async function adminGetAnalyticsAndMonitoringData() {
  await requireRole("admin");

  const startTime = Date.now();

  // 1. Fetch System Settings
  let systemSettings = await prisma.systemSetting.findUnique({ where: { id: "default" } });
  if (!systemSettings) {
    systemSettings = await prisma.systemSetting.create({
      data: {
        id: "default",
        rewardPointRate: 1.0,
        rewardPointsPerBooking: 10,
        premiumMonthlyPrice: 499,
        premiumAnnualPrice: 4499,
        platformCommissionRate: 10.0,
      },
    });
  }

  // 2. Fetch Users & Tutor Profiles
  const users = await prisma.user.findMany({
    include: {
      academicInfo: { select: { currentClass: true, institution: true, subjects: true } },
      studentProfiles: { select: { studentName: true, currentClass: true, institution: true, subjects: true } },
      tutorProfile: { select: { tagline: true, subjects: true, hourlyFee: true, verificationStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tutors = await prisma.tutorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          location: true,
          district: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch Bookings for monthly session analytics
  const allBookings = await prisma.booking.findMany({
    select: {
      id: true,
      date: true,
      status: true,
      createdAt: true,
    },
    orderBy: { date: "asc" },
  });

  // 4. Fetch Subscription Payments for revenue analytics
  const payments = await prisma.subscriptionPayment.findMany({
    orderBy: { createdAt: "asc" },
  });

  // 5. Additional counts for system health monitoring
  const [totalReviews, totalMessages, totalBotMessages] = await Promise.all([
    prisma.review.count(),
    prisma.message.count(),
    prisma.tutorBotMessage.count(),
  ]);

  const dbLatencyMs = Date.now() - startTime;

  // Process User metrics
  const totalUsersCount = users.length;
  const studentCount = users.filter((u) => u.role === "student").length;
  const parentCount = users.filter((u) => u.role === "parent").length;
  const tutorCount = users.filter((u) => u.role === "tutor").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const premiumUsersCount = users.filter((u) => u.isPremium).length;
  const suspendedUsersCount = users.filter((u) => u.status === "suspended").length;
  const flaggedUsersCount = users.filter((u) => u.isFlagged).length;

  // Process Monthly Sessions Booked per month
  const monthlyBookingsMap: Record<string, { total: number; completed: number }> = {};

  // Build range of last 6 months up to current month
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const monthKey = `${year}-${month}`;
    monthlyBookingsMap[monthKey] = { total: 0, completed: 0 };
  }

  allBookings.forEach((b) => {
    let monthKey = b.date ? b.date.substring(0, 7) : "";
    if (!monthKey || monthKey.length < 7) {
      monthKey = b.createdAt.toISOString().substring(0, 7);
    }
    if (monthlyBookingsMap[monthKey] === undefined) {
      monthlyBookingsMap[monthKey] = { total: 0, completed: 0 };
    }
    monthlyBookingsMap[monthKey].total += 1;
    if (b.status === "completed") {
      monthlyBookingsMap[monthKey].completed += 1;
    }
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyBookingsStats: MonthlyBookingStat[] = Object.keys(monthlyBookingsMap)
    .sort()
    .slice(-6)
    .map((monthKey) => {
      const [y, m] = monthKey.split("-");
      const monthIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[monthIdx] || m} ${y}`;
      return {
        monthKey,
        label,
        totalBookings: monthlyBookingsMap[monthKey].total,
        completedBookings: monthlyBookingsMap[monthKey].completed,
      };
    });

  // Process Revenue generated from Premium Subscriptions
  const historicalPaymentsRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const projectedActivePremiumRevenue = premiumUsersCount * systemSettings.premiumMonthlyPrice;
  const totalRevenue = historicalPaymentsRevenue + projectedActivePremiumRevenue;

  const monthlyRevenueMap: Record<string, { revenue: number; count: number }> = {};
  Object.keys(monthlyBookingsMap).forEach((mk) => {
    monthlyRevenueMap[mk] = { revenue: 0, count: 0 };
  });

  payments.forEach((p) => {
    const monthKey = p.createdAt.toISOString().substring(0, 7);
    if (monthlyRevenueMap[monthKey] === undefined) {
      monthlyRevenueMap[monthKey] = { revenue: 0, count: 0 };
    }
    monthlyRevenueMap[monthKey].revenue += p.amount;
    monthlyRevenueMap[monthKey].count += 1;
  });

  const monthlyRevenueStats: MonthlyRevenueStat[] = Object.keys(monthlyRevenueMap)
    .sort()
    .slice(-6)
    .map((monthKey) => {
      const [y, m] = monthKey.split("-");
      const monthIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[monthIdx] || m} ${y}`;
      return {
        monthKey,
        label,
        subscriptionRevenue: monthlyRevenueMap[monthKey].revenue,
        paymentCount: monthlyRevenueMap[monthKey].count,
      };
    });

  // Recent tutor verifications
  const pendingVerificationsCount = tutors.filter((t) => t.verificationStatus === "pending").length;

  const systemHealth: SystemMonitoringHealth = {
    dbConnected: true,
    dbLatencyMs,
    totalUsers: totalUsersCount,
    totalBookings: allBookings.length,
    totalTutorProfiles: tutors.length,
    totalReviews,
    totalMessages,
    totalBotMessages,
    lastHealthCheck: new Date().toISOString(),
  };

  return {
    systemSettings,
    userCounts: {
      total: totalUsersCount,
      students: studentCount,
      parents: parentCount,
      tutors: tutorCount,
      admins: adminCount,
      premium: premiumUsersCount,
      suspended: suspendedUsersCount,
      flagged: flaggedUsersCount,
    },
    monthlyBookingsStats,
    revenueStats: {
      totalRevenue,
      historicalPaymentsRevenue,
      projectedActivePremiumRevenue,
      monthlyRevenueStats,
      activePremiumUsers: premiumUsersCount,
      monthlyPrice: systemSettings.premiumMonthlyPrice,
      annualPrice: systemSettings.premiumAnnualPrice,
    },
    pendingVerificationsCount,
    systemHealth,
  };
}
