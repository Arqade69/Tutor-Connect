import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { StudentProfileList } from "@/components/StudentProfileList";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "parent") redirect(dashboardFor(user.role));

  const studentProfiles = await prisma.studentProfile.findMany({
    where: { parentId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user.name?.split(" ")[0] ?? "Parent"} 👋
        </h1>
        <p className="mt-1 text-slate-500">
          Manage your account and the students you book tutoring for.
        </p>
      </header>

      {/* Parent's own information */}
      <section id="profile" className="card scroll-mt-24 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Your information</h2>
          <p className="text-sm text-slate-500">Keep your contact and location up to date.</p>
        </div>
        <ProfileForm
          name={user.name}
          phone={user.phone}
          location={user.location}
          district={user.district}
        />
      </section>

      {/* Student profiles */}
      <section id="profiles" className="card scroll-mt-24 p-6">
        <StudentProfileList items={studentProfiles} />
      </section>
    </div>
  );
}
