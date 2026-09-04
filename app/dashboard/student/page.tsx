import { redirect } from "next/navigation";
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

      {/* Cross-module quick links (other modules — placeholders) */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          More on Tutor-Connect
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ComingSoonCard title="AI Assistant (TutorBot)" desc="Premium 24/7 study help." premium />
        </div>
      </section>
    </div>
  );
}

function ComingSoonCard({
  title,
  desc,
  premium,
}: {
  title: string;
  desc: string;
  premium?: boolean;
}) {
  return (
    <div className="card relative p-5 opacity-80">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-slate-700">{title}</span>
        <span className="badge bg-slate-100 text-slate-500">Coming soon</span>
      </div>
      <p className="text-sm text-slate-500">{desc}</p>
      {premium && (
        <span className="badge mt-3 bg-amber-50 text-amber-700">Premium feature</span>
      )}
    </div>
  );
}
