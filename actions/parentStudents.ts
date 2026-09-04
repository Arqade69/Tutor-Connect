"use server";

import { prisma } from "@/lib/prisma";
import { guard, clean, requireRole, revalidatePath } from "./_shared";

/**
 * Search users by name or email (case-insensitive).
 * Used by parents to find existing students to link.
 * Excludes admins and the parent themselves.
 */
export async function searchUsers(query: string) {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  // Get the current parent (for exclusion)
  const parent = await requireRole("parent");

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: parent.id } },
        { role: { not: "admin" } },
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  return users;
}

/**
 * Link an existing user as a student under the current parent's account.
 * Creates a StudentProfile entry and sends a notification to the student.
 */
export async function linkExistingStudent(formData: FormData) {
  return guard(async () => {
    const parent = await requireRole("parent");

    const existingCount = await prisma.studentProfile.count({
      where: { parentId: parent.id },
    });
    if (existingCount >= 5) {
      throw new Error("Maximum limit reached: You can add up to 5 student profiles per parent account.");
    }

    const studentUserId = clean(formData.get("studentUserId"));

    if (!studentUserId) throw new Error("Please select a student.");

    // Look up the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: {
        academicInfo: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    if (!targetUser) throw new Error("User not found.");
    if (targetUser.role === "admin")
      throw new Error("Cannot link an admin account.");

    // Check if already linked
    const alreadyLinked = await prisma.studentProfile.findFirst({
      where: {
        parentId: parent.id,
        studentName: targetUser.name ?? targetUser.email,
      },
    });
    if (alreadyLinked) throw new Error("This student is already linked to your account.");

    // Grab academic info if available
    const academic = targetUser.academicInfo[0];

    await prisma.studentProfile.create({
      data: {
        parentId: parent.id,
        studentName: targetUser.name ?? targetUser.email,
        currentClass: academic?.currentClass ?? "Class 1",
        institution: academic?.institution ?? "Not specified",
        subjects: academic?.subjects ?? "Not specified",
      },
    });

    // Send notification to the student
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: "parent_link_request",
        title: "Added to a parent account",
        message: `${parent.name ?? parent.email} has linked you as a student under their account.`,
        metadata: JSON.stringify({
          parentId: parent.id,
          parentName: parent.name,
          parentEmail: parent.email,
        }),
      },
    });

    revalidatePath("/dashboard/parent");
  });
}
