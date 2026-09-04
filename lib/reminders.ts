import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

// Bookings store date ("YYYY-MM-DD") and time ("HH:mm") as local
// wall-clock strings with no timezone attached. This fixed UTC offset
// (in minutes) is used to resolve them into real instants for scheduling.
// Default is Asia/Dhaka (UTC+6, no DST) — override with APP_UTC_OFFSET_MINUTES.
const APP_UTC_OFFSET_MINUTES = Number(process.env.APP_UTC_OFFSET_MINUTES ?? 360);

// How far ahead a recurring "monthly" booking stays active, matching the
// window used elsewhere (see isWithinOneMonthWindow in actions/booking.ts).
const RECURRING_WINDOW_DAYS = 30;

const JS_DAY_NAMES_LOWER = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

/** Resolves a YYYY-MM-DD date + HH:mm time into a real Date (UTC instant). */
function sessionStartDate(date: string, startTime: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  if (!y || !m || !d || hh === undefined || isNaN(hh) || mm === undefined || isNaN(mm)) {
    return null;
  }
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - APP_UTC_OFFSET_MINUTES * 60_000;
  return new Date(utcMs);
}

type ReminderBooking = {
  id: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  bookingType: string;
  reminder24SentForDate: string | null;
  reminder1SentForDate: string | null;
  student: { id: string; name: string | null; email: string };
  tutor: { userId: string; user: { name: string | null; email: string } };
};

/**
 * Finds the next upcoming occurrence of a booking:
 *  - "one_time" bookings only ever have one occurrence: date + startTime.
 *  - "monthly" (recurring) bookings store `date` as the day the booking was
 *    *made*, not a specific session date — `dayOfWeek` (possibly several,
 *    comma-separated) is what actually recurs each week. This walks forward
 *    from that anchor date, within the 30-day active window, to find the
 *    soonest future date matching one of the recurring weekdays.
 * Returns null if there's no valid/future occurrence (e.g. the recurring
 * window has fully elapsed).
 */
function nextOccurrence(booking: {
  date: string;
  dayOfWeek: string;
  startTime: string;
  bookingType: string;
}): { start: Date; dateStr: string } | null {
  if (booking.bookingType !== "monthly") {
    const start = sessionStartDate(booking.date, booking.startTime);
    return start ? { start, dateStr: booking.date } : null;
  }

  const days = booking.dayOfWeek
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (days.length === 0) return null;

  const windowStart = new Date(`${booking.date}T00:00:00Z`);
  if (isNaN(windowStart.getTime())) return null;

  const now = Date.now();
  let earliest: { start: Date; dateStr: string } | null = null;

  for (const dayName of days) {
    const targetDow = JS_DAY_NAMES_LOWER.indexOf(dayName);
    if (targetDow === -1) continue;

    // Walk forward day-by-day from the anchor date, across the recurring
    // window, looking for the soonest matching weekday whose start time is
    // still in the future.
    const cursor = new Date(windowStart);
    for (let i = 0; i <= RECURRING_WINDOW_DAYS; i++) {
      if (cursor.getUTCDay() === targetDow) {
        const dateStr = cursor.toISOString().split("T")[0];
        const candidateStart = sessionStartDate(dateStr, booking.startTime);
        if (candidateStart && candidateStart.getTime() > now) {
          if (!earliest || candidateStart < earliest.start) {
            earliest = { start: candidateStart, dateStr };
          }
          break; // nearest match found for this weekday, move to the next one
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return earliest;
}

async function sendSessionReminder(booking: ReminderBooking, window: "24h" | "1h", occurrenceDateStr: string) {
  const label = window === "24h" ? "in about 24 hours" : "in about 1 hour";

  await notifyUser({
    userId: booking.student.id,
    email: booking.student.email,
    type: `session_reminder_${window}`,
    title: `Reminder: your session starts ${label}`,
    message: `Your ${booking.subject} session with ${
      booking.tutor.user.name ?? "your tutor"
    } is scheduled for ${occurrenceDateStr} at ${booking.startTime} — starting ${label}.`,
    metadata: { bookingId: booking.id },
  });

  await notifyUser({
    userId: booking.tutor.userId,
    email: booking.tutor.user.email,
    type: `session_reminder_${window}`,
    title: `Reminder: your session starts ${label}`,
    message: `Your ${booking.subject} session with ${
      booking.student.name ?? "your student"
    } is scheduled for ${occurrenceDateStr} at ${booking.startTime} — starting ${label}.`,
    metadata: { bookingId: booking.id },
  });
}

/**
 * Finds every confirmed booking's next occurrence, and — for whichever ones
 * fall within 24h or 1h of starting — sends that reminder once per
 * occurrence. Safe to call repeatedly/frequently (e.g. every 15 minutes via
 * cron, or every 30s locally): each occurrence's reminder only fires once,
 * tracked by that occurrence's date rather than a permanent flag, so
 * recurring "monthly" bookings correctly get a fresh reminder each week.
 */
export async function sendDueSessionReminders() {
  const now = Date.now();

  const candidates = await prisma.booking.findMany({
    where: { status: "confirmed" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      tutor: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  let sent24 = 0;
  let sent1 = 0;

  for (const booking of candidates) {
    const occurrence = nextOccurrence(booking);
    if (!occurrence) continue;

    const msUntilStart = occurrence.start.getTime() - now;
    if (msUntilStart <= 0) continue; // shouldn't happen given the future-only search, but stay safe

    const hoursUntilStart = msUntilStart / 3_600_000;

    if (booking.reminder24SentForDate !== occurrence.dateStr && hoursUntilStart <= 24) {
      await sendSessionReminder(booking, "24h", occurrence.dateStr);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminder24SentForDate: occurrence.dateStr },
      });
      sent24++;
    }

    if (booking.reminder1SentForDate !== occurrence.dateStr && hoursUntilStart <= 1) {
      await sendSessionReminder(booking, "1h", occurrence.dateStr);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminder1SentForDate: occurrence.dateStr },
      });
      sent1++;
    }
  }

  return { checked: candidates.length, sent24, sent1 };
}

// =====================================================================
//  Local-dev-only automatic scheduler.
//
//  In production (Vercel), the /api/cron/session-reminders endpoint is
//  triggered on a schedule by vercel.json instead — serverless functions
//  can't run a persistent setInterval like this. But while running
//  `next dev` locally, the Node process stays alive the whole time, so
//  this gives you the same "automatic" behavior without needing an
//  external cron caller. See instrumentation.ts for where this is started.
// =====================================================================

let localSchedulerStarted = false;

export function startLocalReminderScheduler(intervalMs = 30_000) {
  if (localSchedulerStarted) return;
  localSchedulerStarted = true;

  console.log(`[reminders] Local dev scheduler started — checking every ${intervalMs / 1000}s.`);

  setInterval(async () => {
    try {
      const result = await sendDueSessionReminders();
      if (result.sent24 > 0 || result.sent1 > 0) {
        console.log(`[reminders] Sent ${result.sent24} 24h and ${result.sent1} 1h reminder(s).`);
      }
    } catch (err) {
      console.error("[reminders] Local scheduler run failed:", err);
    }
  }, intervalMs);
}
