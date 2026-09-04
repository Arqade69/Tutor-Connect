import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { getTutorBotHistory } from "@/actions/tutorbot";
import { TutorBotChat } from "@/components/TutorBotChat";

export const metadata = {
  title: "TutorBot AI — Tutor-Connect",
  description:
    "AI-powered study assistant for SSC, HSC, O-Level, A-Level, and Admission prep.",
};

export default async function TutorBotPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/clear-session");
  if (user.role !== "student" && user.role !== "tutor") {
    redirect(dashboardFor(user.role));
  }

  const { messages, remaining, isPremium, dailyLimit } =
    await getTutorBotHistory();

  return (
    <div>
      <TutorBotChat
        initialMessages={messages}
        initialRemaining={remaining}
        isPremium={isPremium}
        dailyLimit={dailyLimit}
        userRole={user.role as "student" | "tutor"}
      />
    </div>
  );
}
