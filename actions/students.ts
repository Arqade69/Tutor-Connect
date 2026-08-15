"use server";

import { prisma } from "@/lib/prisma";
import { CLASS_LEVELS } from "@/lib/constants";
import { guard, clean, requireText, requireRole, revalidatePath } from "./_shared";

/** Add a student profile under the logged-in parent's account. */
export async function createStudentProfile(formData: FormData) {
  return guard(async () => {
    const parent = await requireRole("parent");

    const existingCount = await prisma.studentProfile.count({
      where: { parentId: parent.id },
    });
    if (existingCount >= 5) {
      throw new Error("Maximum limit reached: You can add up to 5 student profiles per parent account.");
    }

    const studentName = requireText(formData.get("studentName"), "Student name");
    const currentClass = clean(formData.get("currentClass"));
    if (!CLASS_LEVELS.includes(currentClass as never))
      throw new Error("Please choose a valid current class.");
    const institution = requireText(formData.get("institution"), "Institution");
    const subjects = requireText(formData.get("subjects"), "Subjects they need help with", 1, 500);

    await prisma.studentProfile.create({
      data: { parentId: parent.id, studentName, currentClass, institution, subjects },
    });
    revalidatePath("/dashboard/parent");
  });
}

/** Edit an existing student profile (must belong to the parent). */
export async function updateStudentProfile(formData: FormData) {
  return guard(async () => {
    const parent = await requireRole("parent");
    const id = clean(formData.get("id"));
    const studentName = requireText(formData.get("studentName"), "Student name");
    const currentClass = clean(formData.get("currentClass"));
    if (!CLASS_LEVELS.includes(currentClass as never))
      throw new Error("Please choose a valid current class.");
    const institution = requireText(formData.get("institution"), "Institution");
    const subjects = requireText(formData.get("subjects"), "Subjects they need help with", 1, 500);

    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing || existing.parentId !== parent.id)
      throw new Error("Record not found.");

    await prisma.studentProfile.update({
      where: { id },
      data: { studentName, currentClass, institution, subjects },
    });
    revalidatePath("/dashboard/parent");
  });
}

/** Delete a student profile (must belong to the parent). */
export async function deleteStudentProfile(formData: FormData) {
  return guard(async () => {
    const parent = await requireRole("parent");
    const id = clean(formData.get("id"));
    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing || existing.parentId !== parent.id)
      throw new Error("Record not found.");
    await prisma.studentProfile.delete({ where: { id } });
    revalidatePath("/dashboard/parent");
  });
}
