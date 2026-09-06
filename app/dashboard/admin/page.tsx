import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { adminGetAnalyticsAndMonitoringData } from "@/actions/admin";
import { AdminAnalyticsDashboard } from "@/components/AdminAnalyticsDashboard";
import type { AdminUser } from "@/components/UsersTable";
import type { AdminTutorProfile } from "@/components/TutorVerifications";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(dashboardFor(user.role));

  const analyticsData = await adminGetAnalyticsAndMonitoringData();

  const dbUsers = await prisma.user.findMany({
    where: { role: { in: ["student", "parent", "tutor"] } },
    include: {
      academicInfo: { select: { currentClass: true, institution: true, subjects: true } },
      studentProfiles: { select: { studentName: true, currentClass: true, institution: true, subjects: true } },
      tutorProfile: { select: { tagline: true, subjects: true, hourlyFee: true, verificationStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const dbTutors = await prisma.tutorProfile.findMany({
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

  const tutors: AdminTutorProfile[] = dbTutors.map((t) => ({
    id: t.id,
    userId: t.userId,
    tagline: t.tagline,
    bio: t.bio,
    subjects: t.subjects,
    classLevels: t.classLevels,
    medium: t.medium,
    hourlyFee: t.hourlyFee,
    isPublic: t.isPublic,
    verificationStatus: t.verificationStatus,
    createdAt: t.createdAt.toISOString(),
    user: t.user,
  }));

  const users: AdminUser[] = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    location: u.location,
    district: u.district,
    isPremium: u.isPremium,
    status: u.status,
    isFlagged: u.isFlagged,
    flagReason: u.flagReason,
    createdAt: u.createdAt.toISOString(),
    academicInfo: u.academicInfo,
    studentProfiles: u.studentProfiles,
    tutorProfile: u.tutorProfile,
  }));

  return (
    <AdminAnalyticsDashboard
      systemSettings={analyticsData.systemSettings}
      rewardSettings={analyticsData.rewardSettings}
      userCounts={analyticsData.userCounts}
      monthlyBookingsStats={analyticsData.monthlyBookingsStats}
      revenueStats={analyticsData.revenueStats}
      pendingVerificationsCount={analyticsData.pendingVerificationsCount}
      systemHealth={analyticsData.systemHealth}
      users={users}
      tutors={tutors}
    />
  );
}
