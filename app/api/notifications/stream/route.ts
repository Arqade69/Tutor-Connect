import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// =====================================================================
//  Pushes live unread-notification-count updates over Server-Sent Events,
//  replacing the old 30s client-side polling loop.
//
//  Why SSE instead of WebSockets: this only ever needs to push data one
//  way (server -> client) — the client never needs to send anything back
//  over this same channel. Vercel's native WebSocket support is still in
//  public beta and pins a connection to a single function instance with
//  no built-in cross-instance broadcast (would need an extra Redis
//  add-on to be reliable at more than one instance). SSE avoids all of
//  that: it's a long-supported, simple one-way stream.
//
//  Why this is safe on serverless: rather than holding shared state in
//  memory (which wouldn't be visible across function instances anyway),
//  each open connection just re-queries Postgres — the same durable
//  source of truth every instance already reads from — every few
//  seconds and only sends a message when the count actually changed.
//  No pub/sub layer needed for correctness, only if you wanted
//  sub-second latency, which a notification bell doesn't need.
//
//  Why this doesn't need to hold the connection open forever: Vercel
//  will eventually recycle any long-running function (see maxDuration
//  below). When that happens, the stream just ends — the browser's
//  native EventSource API automatically reconnects on its own, so a new
//  function instance picks up right where the old one left off.
// =====================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — after this Vercel ends the connection; EventSource auto-reconnects

const POLL_INTERVAL_MS = 4_000;
const HEARTBEAT_EVERY_N_TICKS = 5; // ~20s — keeps intermediary proxies from timing out an idle stream

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const stop = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", stop);

      let lastCount = -1;
      let ticks = 0;

      while (!closed) {
        try {
          const count = await prisma.notification.count({
            where: { userId: user.id, isRead: false },
          });
          if (count !== lastCount) {
            send("unread-count", { count });
            lastCount = count;
          }
        } catch (err) {
          console.error("[notifications/stream] poll failed:", err);
        }

        ticks++;
        if (!closed && ticks % HEARTBEAT_EVERY_N_TICKS === 0) {
          // Comment lines (leading ":") are ignored by EventSource but
          // keep the connection alive through proxies/load balancers.
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disables response buffering on nginx-style proxies
    },
  });
}
