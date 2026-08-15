import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/ui";
import { UsersTable, type AdminUser } from "@/components/UsersTable";
import { TutorVerifications, type AdminTutorProfile } from "@/components/TutorVerifications";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(dashboardFor(user.role));

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
    createdAt: u.createdAt.toISOString(),
    academicInfo: u.academicInfo,
    studentProfiles: u.studentProfiles,
    tutorProfile: u.tutorProfile,
  }));

  const students = users.filter((u) => u.role === "student").length;
  const parents = users.filter((u) => u.role === "parent").length;
  const tutorRoleCount = users.filter((u) => u.role === "tutor").length;
  const pendingVerifications = tutors.filter((t) => t.verificationStatus === "pending").length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin · Management Dashboard</h1>
          <p className="mt-1 text-slate-500">
            Review tutor registrations, verify credentials, and manage all platform accounts.
          </p>
        </div>
      </header>

      <section id="stats" className="grid scroll-mt-24 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Total users" value={users.length} accent="brand" />
        <StatTile label="Students" value={students} accent="brand" />
        <StatTile label="Parents" value={parents} accent="emerald" />
        <StatTile label="Tutors" value={tutorRoleCount} accent="brand" />
        <StatTile label="Pending Approvals" value={pendingVerifications} accent="amber" />
      </section>

      <section id="verifications" className="card scroll-mt-24 p-6">
        <TutorVerifications tutors={tutors} />
      </section>

      <section id="users" className="card scroll-mt-24 p-6">
        <UsersTable users={users} />
      </section>
    </div>
  );
}
