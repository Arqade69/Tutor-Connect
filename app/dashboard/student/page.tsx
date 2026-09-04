import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { AcademicInfoList } from "@/components/AcademicInfoList";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect(dashboardFor(user.role));

  const academicInfo = await prisma.academicInfo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user.name?.split(" ")[0] ?? "Student"} 👋
        </h1>
        <p className="mt-1 text-slate-500">Manage your profile and academic details.</p>
      </header>

      {/* Personal information */}
      <section id="profile" className="card scroll-mt-24 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Personal information</h2>
          <p className="text-sm text-slate-500">Keep your contact and location up to date.</p>
        </div>
        <ProfileForm
          name={user.name}
          phone={user.phone}
          location={user.location}
          district={user.district}
        />
      </section>

      {/* Academic details */}
      <section id="academic" className="card scroll-mt-24 p-6">
        <AcademicInfoList items={academicInfo} />
      </section>

      {/* Cross-module quick links */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          More on Tutor-Connect
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              24/7 study help for SSC, HSC, O/A-Level & Admission prep.
            </p>
            <span className="badge mt-3 inline-block bg-amber-50 text-amber-700">
              {user.isPremium ? "Unlimited Premium" : "Free (5/day)"}
            </span>
          </Link>

          <Link
            href="/dashboard/subscription"
            className="card group relative p-5 transition hover:border-brand-300 hover:shadow-md bg-gradient-to-br from-white via-slate-50 to-brand-50/30"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800 group-hover:text-brand-600 flex items-center gap-1.5">
                <span>Subscription & Plans</span>
                <span>👑</span>
              </span>
              <span className="badge bg-brand-50 text-brand-700">UddoktaPay</span>
            </div>
            <p className="text-sm text-slate-500">
              Upgrade to Premium via UddoktaPay & redeem reward points for discounts.
            </p>
            <span className="badge mt-3 inline-block bg-brand-600 text-white font-medium">
              {user.isPremium ? "Manage Plan" : "Upgrade Now"}
            </span>
          </Link>

          <Link
            href="/dashboard/tutors"
            className="card group relative p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800 group-hover:text-brand-600">
                Find a Tutor
              </span>
              <span className="badge bg-blue-50 text-blue-700">Search</span>
            </div>
            <p className="text-sm text-slate-500">
              Browse tutors by subject, class level, district & geolocation map.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
