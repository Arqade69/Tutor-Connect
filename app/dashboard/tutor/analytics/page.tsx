import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { getTutorAnalyticsData } from "@/actions/tutorAnalytics";
import { TutorAnalyticsDashboard } from "@/components/TutorAnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function TutorAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "tutor") redirect(dashboardFor(user.role));

  const analyticsData = await getTutorAnalyticsData();

  return <TutorAnalyticsDashboard initialData={analyticsData} />;
}
