import { NextResponse, type NextRequest } from "next/server";
import { sendDueSessionReminders } from "@/lib/reminders";

/**
 * Meant to be hit on a schedule (every 10–15 minutes is plenty) by an
 * external scheduler — Vercel Cron (see vercel.json), GitHub Actions,
 * cron-job.org, etc. Each run finds confirmed sessions starting within the
 * next 24h/1h that haven't had that reminder sent yet, and sends it.
 *
 * If CRON_SECRET is set, the caller must send it as a bearer token:
 *   Authorization: Bearer <CRON_SECRET>
 * Vercel Cron does this automatically when CRON_SECRET is configured.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await sendDueSessionReminders();
  return NextResponse.json({ ok: true, ...result });
}
