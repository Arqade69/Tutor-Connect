// Next.js calls this once when the server starts. We use it purely to
// kick off the local-dev reminder scheduler — see lib/reminders.ts for
// why this only runs in development, not in production.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
    const { startLocalReminderScheduler } = await import("./lib/reminders");
    startLocalReminderScheduler();
  }
}
