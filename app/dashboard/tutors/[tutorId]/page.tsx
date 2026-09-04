import { notFound } from "next/navigation";
import { getTutorDetails } from "@/actions/tutorSearch";
import { getReviewableBookings } from "@/actions/review";
import { getCurrentUser } from "@/lib/session";
import { TutorProfileClient } from "./TutorProfileClient";

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ tutorId: string }>;
}) {
  const { tutorId } = await params;
  const tutor = await getTutorDetails(tutorId);
  const currentUser = await getCurrentUser();

  if (!tutor) {
    notFound();
  }

  const reviewableBookings = currentUser ? await getReviewableBookings(tutorId) : [];

  return (
    <TutorProfileClient
      tutor={tutor}
      currentUserRole={currentUser?.role}
      reviewableBookings={reviewableBookings}
    />
  );
}
