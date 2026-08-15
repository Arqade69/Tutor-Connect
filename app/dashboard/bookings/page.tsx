import { getUserBookings } from "@/actions/booking";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BookingsClient } from "./BookingsClient";

export default async function BookingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const bookings = await getUserBookings();

  return (
    <BookingsClient
      initialBookings={bookings}
      userRole={currentUser.role}
    />
  );
}
