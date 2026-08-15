import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  // Session cookie exists but no DB user (e.g. DB was re-seeded) → clear the
  // stale cookie instead of bouncing to /login (which middleware would reject).
  if (!user) redirect("/auth/clear-session");
  if (user.onboarded) redirect(dashboardFor(user.role));

  return (
    <OnboardingForm
      defaultName={user.name ?? ""}
      defaultEmail={user.email}
      image={user.image}
    />
  );
}
