"use server";

import { prisma } from "@/lib/prisma";
import { CLASS_LEVELS } from "@/lib/constants";
import { guard, clean, requireText, requireRole, revalidatePath } from "./_shared";

/** Create a new academic-info record for the logged-in student. */
export async function createAcademicInfo(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("student");
    const currentClass = clean(formData.get("currentClass"));
    if (!CLASS_LEVELS.includes(currentClass as never))
      throw new Error("Please choose a valid current class.");
    const institution = requireText(formData.get("institution"), "Institution");
    const subjects = requireText(formData.get("subjects"), "Subjects you need help with", 1, 500);

    await prisma.academicInfo.create({
      data: { userId: user.id, currentClass, institution, subjects },
    });
    revalidatePath("/dashboard/student");
  });
}

/** Update an existing academic-info record (must belong to the student). */
export async function updateAcademicInfo(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("student");
    const id = clean(formData.get("id"));
    const currentClass = clean(formData.get("currentClass"));
    if (!CLASS_LEVELS.includes(currentClass as never))
      throw new Error("Please choose a valid current class.");
    const institution = requireText(formData.get("institution"), "Institution");
    const subjects = requireText(formData.get("subjects"), "Subjects you need help with", 1, 500);

    const existing = await prisma.academicInfo.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id)
      throw new Error("Record not found.");

    await prisma.academicInfo.update({
      where: { id },
      data: { currentClass, institution, subjects },
    });
    revalidatePath("/dashboard/student");
  });
}

/** Delete an academic-info record (must belong to the student). */
export async function deleteAcademicInfo(formData: FormData) {
  return guard(async () => {
    const user = await requireRole("student");
    const id = clean(formData.get("id"));
    const existing = await prisma.academicInfo.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id)
      throw new Error("Record not found.");
    await prisma.academicInfo.delete({ where: { id } });
    revalidatePath("/dashboard/student");
  });
}
