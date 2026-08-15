"use server";

import { prisma } from "@/lib/prisma";
import { dashboardFor, requireUser } from "@/lib/session";
import { clean, guard, requireText, revalidatePath, validatePhone } from "./_shared";

/** First-login onboarding: pick role + fill basic profile. */
export async function completeOnboarding(formData: FormData) {
  return guard(async () => {
    const user = await requireUser();
    const role = clean(formData.get("role"));
    if (role !== "student" && role !== "parent" && role !== "tutor")
      throw new Error("Please choose Student, Parent, or Tutor.");
    if (user.role === "admin") throw new Error("Admins do not need onboarding.");

    const name = requireText(formData.get("name"), "Full name");
    const phone = validatePhone(formData.get("phone") as string);
    const location = clean(formData.get("location"));
    const district = clean(formData.get("district"));

    await prisma.user.update({
      where: { id: user.id },
      data: { role, name, phone, location, district, onboarded: true },
    });

    revalidatePath("/", "layout");
    revalidatePath("/onboarding");
    revalidatePath(dashboardFor(role));
  });
}

/** Edit the logged-in user's personal information. */
export async function updateProfile(formData: FormData) {
  return guard(async () => {
    const user = await requireUser();
    const name = requireText(formData.get("name"), "Full name");
    const phone = validatePhone(formData.get("phone") as string);
    const location = clean(formData.get("location"));
    const district = clean(formData.get("district"));

    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone, location, district },
    });

    revalidatePath("/dashboard/student");
    revalidatePath("/dashboard/parent");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/tutor");
  });
}
