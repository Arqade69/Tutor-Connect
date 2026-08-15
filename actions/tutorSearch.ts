"use server";

import { prisma } from "@/lib/prisma";

export type TutorFilterInput = {
  query?: string;
  subject?: string;
  classLevel?: string;
  district?: string;
  medium?: string;
  dayOfWeek?: string;
  minFee?: number;
  maxFee?: number;
};

export async function searchTutors(filters: TutorFilterInput = {}) {
  const { query, subject, classLevel, district, medium, dayOfWeek, minFee, maxFee } = filters;

  const whereClause: any = {
    isPublic: true,
    verificationStatus: "approved",
  };

  if (medium && medium !== "All") {
    whereClause.medium = { in: [medium, "Both"] };
  }

  if (minFee !== undefined || maxFee !== undefined) {
    whereClause.hourlyFee = {};
    if (minFee !== undefined && !isNaN(minFee)) whereClause.hourlyFee.gte = minFee;
    if (maxFee !== undefined && !isNaN(maxFee)) whereClause.hourlyFee.lte = maxFee;
  }

  if (subject && subject !== "All") {
    whereClause.subjects = { has: subject };
  }

  if (classLevel && classLevel !== "All") {
    whereClause.classLevels = { has: classLevel };
  }

  if (district && district !== "All") {
    whereClause.user = { district };
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    whereClause.OR = [
      { tagline: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { location: { contains: q, mode: "insensitive" } } },
      { user: { district: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (dayOfWeek && dayOfWeek !== "All") {
    whereClause.availabilitySlots = {
      some: { dayOfWeek },
    };
  }

  const tutors = await prisma.tutorProfile.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          location: true,
          district: true,
        },
      },
      availabilitySlots: true,
      reviews: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return tutors.map((t) => {
    const avgRating =
      t.reviews.length > 0
        ? Number((t.reviews.reduce((acc, r) => acc + r.rating, 0) / t.reviews.length).toFixed(1))
        : 5.0;

    return {
      id: t.id,
      userId: t.user.id,
      name: t.user.name ?? "Tutor",
      email: t.user.email,
      image: t.user.image,
      location: t.user.location ?? t.user.district ?? "Bangladesh",
      district: t.user.district ?? "Dhaka",
      tagline: t.tagline ?? "Experienced Tutor",
      bio: t.bio,
      subjects: t.subjects,
      classLevels: t.classLevels,
      medium: t.medium,
      hourlyFee: t.hourlyFee,
      verificationStatus: t.verificationStatus,
      rating: avgRating,
      reviewCount: t.reviews.length,
      availableDays: Array.from(new Set(t.availabilitySlots.map((s) => s.dayOfWeek))),
    };
  });
}

export async function getTutorDetails(tutorId: string) {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          location: true,
          district: true,
          phone: true,
        },
      },
      availabilitySlots: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      reviews: {
        include: {
          author: {
            select: {
              name: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      bookings: {
        where: {
          status: { in: ["pending", "confirmed"] },
        },
        select: {
          date: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          slotId: true,
          bookingType: true,
        },
      },
    },
  });

  if (!tutor) return null;

  const avgRating =
    tutor.reviews.length > 0
      ? Number((tutor.reviews.reduce((acc, r) => acc + r.rating, 0) / tutor.reviews.length).toFixed(1))
      : 5.0;

  return {
    id: tutor.id,
    userId: tutor.user.id,
    name: tutor.user.name ?? "Tutor",
    email: tutor.user.email,
    phone: tutor.user.phone,
    image: tutor.user.image,
    location: tutor.user.location ?? tutor.user.district ?? "Bangladesh",
    district: tutor.user.district ?? "Dhaka",
    tagline: tutor.tagline,
    bio: tutor.bio,
    subjects: tutor.subjects,
    classLevels: tutor.classLevels,
    medium: tutor.medium,
    hourlyFee: tutor.hourlyFee,
    verificationStatus: tutor.verificationStatus,
    rating: avgRating,
    reviewCount: tutor.reviews.length,
    reviews: tutor.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      authorName: r.author.name ?? "Anonymous",
      authorRole: r.author.role,
      authorImage: r.author.image,
    })),
    availabilitySlots: tutor.availabilitySlots,
    activeBookings: tutor.bookings,
  };
}
