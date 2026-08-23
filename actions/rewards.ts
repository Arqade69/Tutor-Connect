"use server";

import { prisma } from "@/lib/prisma";
import { guard, requireRole, revalidatePath } from "./_shared";

// ---- Default reward settings values ----
const DEFAULT_SETTINGS: Record<string, string> = {
  points_per_taka: "20",       // 20 points = ৳1 discount
  points_booking: "20",        // +20 pts for booking a session
  points_session_completed: "30", // +30 pts when session marked completed
  points_review: "25",         // +25 pts for writing a review
  // Subscription renewal points are handled separately (50 monthly / 500 yearly)
};

/**
 * Fetches all reward-system settings from DB, auto-seeding defaults
 * for any missing keys.
 */
export async function getRewardSettings(): Promise<Record<string, string>> {
  // Fetch existing rows
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.keys(DEFAULT_SETTINGS) } },
  });

  const existing = new Map(rows.map((r) => [r.key, r.value]));

  // Seed missing keys
  const missing = Object.entries(DEFAULT_SETTINGS).filter(
    ([k]) => !existing.has(k)
  );

  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map(([key, value]) =>
        prisma.systemSetting.create({ data: { key, value } })
      )
    );
    for (const [k, v] of missing) existing.set(k, v);
  }

  return Object.fromEntries(existing);
}

/**
 * Returns a single numeric reward setting value.
 * Falls back to DEFAULT_SETTINGS if the DB row is missing.
 */
export async function getRewardSettingValue(key: string): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return parseInt(row?.value || DEFAULT_SETTINGS[key] || "0", 10);
}

/**
 * Admin-only: Update reward system settings.
 */
export async function updateRewardSettings(formData: FormData) {
  return guard(async () => {
    await requireRole("admin");

    const updates: { key: string; value: string }[] = [];

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const raw = formData.get(key);
      if (raw !== null) {
        const num = parseInt(String(raw).trim(), 10);
        if (isNaN(num) || num < 0) {
          throw new Error(`Invalid value for ${key}. Must be a non-negative number.`);
        }
        updates.push({ key, value: String(num) });
      }
    }

    if (updates.length === 0) {
      throw new Error("No settings to update.");
    }

    await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    revalidatePath("/dashboard/admin/reward-settings");
  });
}

/**
 * Awards reward points to a Premium user and logs the activity.
 * Skips silently for non-premium users.
 */
export async function awardRewardPoints(
  userId: string,
  action: string,
  description: string,
  pointsOverride?: number
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  });

  // Only premium users earn reward points
  if (!user?.isPremium) return;

  // Determine points to award
  let points = pointsOverride ?? 0;
  if (pointsOverride === undefined) {
    const settingKey =
      action === "booking_created"
        ? "points_booking"
        : action === "session_completed"
        ? "points_session_completed"
        : action === "review_written"
        ? "points_review"
        : null;

    if (settingKey) {
      points = await getRewardSettingValue(settingKey);
    }
  }

  if (points <= 0) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { rewardPoints: { increment: points } },
    }),
    prisma.rewardLog.create({
      data: {
        userId,
        points,
        action,
        description,
      },
    }),
  ]);
}

/**
 * Gets the user's reward log history for the subscription page.
 */
export async function getRewardLogs(userId: string) {
  return prisma.rewardLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
