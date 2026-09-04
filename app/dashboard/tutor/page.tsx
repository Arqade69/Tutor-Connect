import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { AvailabilityManager } from "@/components/AvailabilityManager";

export const dynamic = "force-dynamic";

export default async function TutorDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "tutor") redirect(dashboardFor(user.role));

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      district: true,
      location: true,
      latitude: true,
      longitude: true,
    },
  });

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: user.id },
    include: {
      availabilitySlots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user.name?.split(" ")[0] ?? "Tutor"} 👋
        </h1>
        <p className="mt-1 text-slate-500">Manage your public profile, location for Google Maps discovery, and weekly availability.</p>
      </header>

      {/* Public profile */}
      <section id="profile" className="card scroll-mt-24 p-6">
        <TutorProfileForm profile={profile} user={dbUser} />
      </section>

      {/* Weekly schedule */}
      <section id="schedule" className="card scroll-mt-24 p-6">
        <AvailabilityManager slots={profile?.availabilitySlots ?? []} />
      </section>

      {/* Quick links & Analytics navigation */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Tutor Management & Analytics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/dashboard/tutor/analytics"
            className="card group relative p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800 group-hover:text-brand-600">
                Performance Analytics
              </span>
              <span className="badge bg-emerald-50 text-emerald-700">Active</span>
            </div>
            <p className="text-sm text-slate-500">
              Track total earnings, completed sessions, average ratings & peak demand.
            </p>
          </Link>

          <Link
            href="/dashboard/bookings"
            className="card group relative p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800 group-hover:text-brand-600">
                My Sessions
              </span>
              <span className="badge bg-blue-50 text-blue-700">Active</span>
            </div>
            <p className="text-sm text-slate-500">See upcoming and completed session reservations.</p>
          </Link>

          <Link
            href="/dashboard/tutorbot"
            className="card group relative p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800 group-hover:text-brand-600">
                TutorBot AI
              </span>
              <span className="badge bg-purple-50 text-purple-700">Active</span>
            </div>
            <p className="text-sm text-slate-500">
              AI Teaching Assistant for lesson planning, quiz generation & study help.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
