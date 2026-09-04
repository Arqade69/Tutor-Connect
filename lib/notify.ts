import { prisma } from "@/lib/prisma";
import { sendEmail, bookingEmailTemplate } from "@/lib/mailer";

/**
 * Creates an in-app notification for a user and — best-effort — emails
 * them the same update via Resend. Never throws: a failed
 * notification/email should not roll back the action that triggered it.
 */
export async function notifyUser(params: {
  userId: string;
  email?: string | null;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, email, type, title, message, metadata } = params;

  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }

  if (email) {
    await sendEmail({
      to: email,
      subject: title,
      html: bookingEmailTemplate({ heading: title, body: message }),
    });
  }
}
