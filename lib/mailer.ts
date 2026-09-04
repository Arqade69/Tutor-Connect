// =====================================================================
//  Transactional email helper with two providers, tried in order:
//
//   1. Resend (https://resend.com) — used if RESEND_API_KEY is set.
//      Requires a verified sending domain.
//
//   2. SMTP fallback — used if SMTP_* is set. This is meant for sending
//      through an email account you already own (e.g. a personal Gmail
//      address + an "app password"), which needs NO domain of your own —
//      Gmail already has SPF/DKIM configured for gmail.com, so mail from
//      you@gmail.com is trusted out of the box.
//
//   If neither is configured, the email is logged to the console instead
//   of sent, so booking/notification flows never fail just because email
//   isn't set up yet.
// =====================================================================

import nodemailer from "nodemailer";

const RESEND_API_URL = "https://api.resend.com/emails";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getSmtpTransporter() {
  if (smtpTransporter !== undefined) return smtpTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    smtpTransporter = null;
    return smtpTransporter;
  }

  const port = Number(SMTP_PORT) || 587;
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // true for the 465 SSL port, false for 587/STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return smtpTransporter;
}

async function sendViaResend(input: MailInput, plainText: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL || "Tutor-Connect <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html, text: plainText }),
    });

    if (res.ok) return true;

    const errBody = await res.text().catch(() => "");
    console.error(`[mailer] Resend API responded with ${res.status}:`, errBody);
    return false;
  } catch (err) {
    console.error("[mailer] Failed to send via Resend:", err);
    return false;
  }
}

async function sendViaSmtp(input: MailInput, plainText: string): Promise<boolean> {
  const transporter = getSmtpTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Tutor-Connect" <${process.env.SMTP_USER}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: plainText,
    });
    return true;
  } catch (err) {
    console.error("[mailer] Failed to send via SMTP:", err);
    return false;
  }
}

/** Sends an email via Resend, then SMTP, then logs to the console as a last resort. */
export async function sendEmail({ to, subject, html, text }: MailInput): Promise<void> {
  if (!to) return;

  const plainText = text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const input = { to, subject, html, text };

  if (await sendViaResend(input, plainText)) return;
  if (await sendViaSmtp(input, plainText)) return;

  console.log(`[mailer] No email provider configured — logging instead of sending.\n  To: ${to}\n  Subject: ${subject}`);
}

const SITE_URL =
  process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:1511";

/** Shared branded HTML wrapper for all Tutor-Connect transactional emails. */
export function bookingEmailTemplate({
  heading,
  body,
  ctaLabel = "View in Tutor-Connect",
  ctaPath = "/dashboard/bookings",
}: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaPath?: string;
}) {
  const ctaUrl = `${SITE_URL}${ctaPath}`;

  // Mirrors components/Logo.tsx (indigo→purple gradient badge, "T" mark,
  // amber accent dot) — rebuilt as a table instead of inline SVG, since SVG
  // gets stripped by Outlook and several webmail clients. Tables + inline
  // styles are the reliable pattern for logos in HTML email.
  const logoHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 22px; border-collapse: collapse;">
      <tr>
        <td style="width:44px; height:44px; border-radius:12px; background-color:#4f46e5; background-image:linear-gradient(135deg,#6366f1,#4338ca); text-align:center; vertical-align:middle; position:relative;">
          <span style="display:inline-block; font-family:-apple-system,Segoe UI,Roboto,sans-serif; font-size:22px; font-weight:800; line-height:44px; color:#ffffff;">T</span>
          <span style="position:absolute; bottom:-3px; right:-3px; width:10px; height:10px; border-radius:50%; background:#fbbf24; border:2px solid #ffffff; display:block;"></span>
        </td>
        <td style="width:10px; font-size:0; line-height:0;">&nbsp;</td>
        <td style="vertical-align:middle;">
          <span style="font-family:-apple-system,Segoe UI,Roboto,sans-serif; font-size:19px; font-weight:800; color:#0f172a;">Tutor<span style="color:#4f46e5;">-Connect</span></span>
        </td>
      </tr>
    </table>`;

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
    ${logoHtml}
    <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${heading}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">${body}</p>
    <a href="${ctaUrl}" style="display:inline-block; background:#4f46e5; color:#fff; font-size:13px; font-weight:700; text-decoration:none; padding:10px 18px; border-radius:10px;">${ctaLabel}</a>
    <p style="font-size: 11px; color: #94a3b8; margin-top: 28px;">You're receiving this because of activity on your Tutor-Connect account.</p>
  </div>`;
}
