"use server";

import { prisma } from "@/lib/prisma";
import { guard, requireUser, revalidatePath } from "./_shared";

/** Get all notifications for the current user. */
export async function getNotifications() {
  const user = await requireUser();
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** Get unread notification count for the current user. */
export async function getUnreadCount() {
  const user = await requireUser();
  return prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
}

/** Mark a notification as read. */
export async function markNotificationRead(formData: FormData) {
  return guard(async () => {
    const user = await requireUser();
    const id = (formData.get("id") as string)?.trim();
    if (!id) throw new Error("Notification ID required.");

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== user.id)
      throw new Error("Notification not found.");

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    revalidatePath("/dashboard");
  });
}

/** Mark all notifications as read. */
export async function markAllRead() {
  return guard(async () => {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    revalidatePath("/dashboard");
  });
}
