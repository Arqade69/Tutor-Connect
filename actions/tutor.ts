"use server";

import { prisma } from "@/lib/prisma";
import { SUBJECTS, CLASS_LEVELS, TEACHING_MEDIUMS, DAYS_OF_WEEK } from "@/lib/constants";
import { guard, clean, requireRole, revalidatePath } from "./_shared";
import { getCoordinatesForLocation } from "@/lib/location";

async function getOwnTutorProfile(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Save your profile first, then set your availability.");
  return profile;
}

/** Create or update the logged-in tutor's public profile & teaching details. */
export async function updateTutorProfile(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("tutor");

    const tagline = clean(formData.get("tagline"));
    const bio = clean(formData.get("bio"));
    const subjects = formData.getAll("subjects").map(String).filter(Boolean);
    const classLevels = formData.getAll("classLevels").map(String).filter(Boolean);
    const medium = clean(formData.get("medium")) || "Bangla";
    const hourlyFeeRaw = clean(formData.get("hourlyFee"));

    const district = clean(formData.get("district"));
    const location = clean(formData.get("location"));
    const latRaw = clean(formData.get("latitude"));
    const lngRaw = clean(formData.get("longitude"));

    if (subjects.length === 0) throw new Error("Select at least one subject.");
    if (subjects.some((s) => !SUBJECTS.includes(s as (typeof SUBJECTS)[number])))
      throw new Error("Invalid subject selected.");

    if (classLevels.length === 0) throw new Error("Select at least one class level.");
    if (classLevels.some((c) => !CLASS_LEVELS.includes(c as (typeof CLASS_LEVELS)[number])))
      throw new Error("Invalid class level selected.");

    if (!TEACHING_MEDIUMS.includes(medium as (typeof TEACHING_MEDIUMS)[number]))
      throw new Error("Invalid teaching medium.");

    const hourlyFee = Number(hourlyFeeRaw);
    if (!Number.isFinite(hourlyFee) || hourlyFee <= 0)
      throw new Error("Enter a valid hourly fee.");

    let latitude: number | null = latRaw ? Number(latRaw) : null;
    let longitude: number | null = lngRaw ? Number(lngRaw) : null;

    if (latitude !== null && !Number.isFinite(latitude)) latitude = null;
    if (longitude !== null && !Number.isFinite(longitude)) longitude = null;

    if ((latitude === null || longitude === null) && (district || location)) {
      const fallback = getCoordinatesForLocation(location ?? undefined, district ?? undefined);
      latitude = fallback.lat;
      longitude = fallback.lng;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        district,
        location,
        latitude,
        longitude,
      },
    });

    await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: { tagline, bio, subjects, classLevels, medium, hourlyFee },
      create: { userId: user.id, tagline, bio, subjects, classLevels, medium, hourlyFee },
    });

    revalidatePath("/dashboard/tutor");
    revalidatePath("/dashboard/tutors");
  });
}

/** Toggle whether the tutor's profile is visible in student search. */
export async function toggleProfileVisibility(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("tutor");
    const profile = await getOwnTutorProfile(user.id);
    await prisma.tutorProfile.update({
      where: { id: profile.id },
      data: { isPublic: !profile.isPublic },
    });
    revalidatePath("/dashboard/tutor");
  });
}

/** Add a weekly availability slot. */
export async function addAvailabilitySlot(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("tutor");
    const profile = await getOwnTutorProfile(user.id);

    const dayOfWeek = clean(formData.get("dayOfWeek"));
    const startTime = clean(formData.get("startTime"));
    const endTime = clean(formData.get("endTime"));

    if (!DAYS_OF_WEEK.includes(dayOfWeek as (typeof DAYS_OF_WEEK)[number]))
      throw new Error("Invalid day.");
    if (!startTime || !endTime) throw new Error("Start and end time are required.");
    if (startTime >= endTime) throw new Error("Start time must be before end time.");

    const duplicate = await prisma.availabilitySlot.findFirst({
      where: { tutorId: profile.id, dayOfWeek, startTime, endTime },
    });
    if (duplicate) throw new Error("That slot already exists.");

    await prisma.availabilitySlot.create({
      data: { tutorId: profile.id, dayOfWeek, startTime, endTime },
    });
    revalidatePath("/dashboard/tutor");
  });
}

/** Remove an availability slot (must belong to the tutor, and not be booked). */
export async function deleteAvailabilitySlot(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("tutor");
    const profile = await getOwnTutorProfile(user.id);
    const id = clean(formData.get("id"));

    const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
    if (!slot || slot.tutorId !== profile.id) throw new Error("Slot not found.");
    if (slot.isBooked) throw new Error("Cannot remove a slot that has an active booking.");

    await prisma.availabilitySlot.delete({ where: { id } });
    revalidatePath("/dashboard/tutor");
  });
}
