import { searchTutors } from "@/actions/tutorSearch";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { TutorSearchClient } from "./TutorSearchClient";

export default async function TutorsPage() {
  const user = await getCurrentUser();
  if (user?.role === "tutor") {
    redirect("/dashboard/tutor");
  }

  const initialTutors = await searchTutors({});
  return <TutorSearchClient initialTutors={initialTutors} />;
}
