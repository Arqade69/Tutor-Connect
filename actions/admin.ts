"use server";

import { prisma } from "@/lib/prisma";
import { guard, clean, requireRole, revalidatePath } from "./_shared";

async function getTarget(id: string, adminId: string) {
  if (!id) throw new Error("User id is required.");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("User not found.");
  if (target.id === adminId) throw new Error("You cannot perform this action on your own account.");
  if (target.role === "admin") throw new Error("Admin accounts cannot be modified by other admins here.");
  return target;
}

/** Toggle a user's Premium subscription (admin only). */
export async function adminTogglePremium(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    await prisma.user.update({
      where: { id: target.id },
      data: { isPremium: !target.isPremium },
    });
    revalidatePath("/dashboard/admin");
  });
}

/** Change a user's role between student and parent (admin only). */
export async function adminChangeRole(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    const role = clean(formData.get("role"));
    if (role !== "student" && role !== "parent") throw new Error("Invalid role.");
    await prisma.user.update({ where: { id: target.id }, data: { role } });
    revalidatePath("/dashboard/admin");
  });
}

/** Suspend or reactivate a user (admin only). */
export async function adminToggleStatus(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    const next = target.status === "suspended" ? "active" : "suspended";
    await prisma.user.update({ where: { id: target.id }, data: { status: next } });
    revalidatePath("/dashboard/admin");
  });
}

/** Permanently delete a user (admin only). */
export async function adminDeleteUser(formData: FormData) {
  return guard(async () => {
    const admin = await requireRole("admin");
    const target = await getTarget(clean(formData.get("id")), admin.id);
    await prisma.user.delete({ where: { id: target.id } });
    revalidatePath("/dashboard/admin");
  });
}

/** Verify / approve / reject a tutor registration profile (admin only). */
export async function adminVerifyTutor(formData: FormData) {
  return guard(async () => {
    await requireRole("admin");
    const tutorProfileId = clean(formData.get("tutorProfileId"));
    const status = clean(formData.get("status"));

    if (!tutorProfileId) throw new Error("Tutor profile ID is required.");
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      throw new Error("Invalid verification status.");
    }

    await prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { verificationStatus: status },
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/tutor");
  });
}
