import nodemailer from "nodemailer";

interface SendReceiptOptions {
  email: string;
  name: string;
  amount: number;
  planType: string; // "monthly" | "yearly"
  transactionId: string;
  expiresAt: Date;
}

export async function sendPaymentReceiptEmail({
  email,
  name,
  amount,
  planType,
  transactionId,
  expiresAt,
}: SendReceiptOptions) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If SMTP settings are missing, log gracefully in dev mode
  if (!host || !user || !pass) {
    console.log(
      `[Email Receipt] SMTP not configured. Receipt details for ${email}:\n` +
        `Plan: ${planType.toUpperCase()} (৳${amount})\n` +
        `TrxID: ${transactionId}\n` +
        `Valid until: ${expiresAt.toLocaleDateString()}`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });

  const formattedDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #4f46e5;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">Tutor-Connect</h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Official Payment Receipt</p>
      </div>

      <div style="padding: 24px 0;">
        <h3 style="color: #0f172a; margin-top: 0;">Hello ${name},</h3>
        <p style="color: #334155; line-height: 1.6;">
          Thank you for subscribing to <strong>Tutor-Connect Premium (${planType === "yearly" ? "Yearly" : "Monthly"})</strong>!
          Your payment processed successfully via bKash.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Plan Type:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">Premium (${planType})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Amount Paid:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">৳${amount} BDT</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">bKash TrxID:</td>
              <td style="padding: 6px 0; color: #4f46e5; font-weight: 600; text-align: right; font-size: 14px; font-family: monospace;">${transactionId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Subscription Valid Until:</td>
              <td style="padding: 6px 0; color: #16a34a; font-weight: 600; text-align: right; font-size: 14px;">${formattedDate}</td>
            </tr>
          </table>
        </div>

        <h4 style="color: #0f172a; margin-bottom: 8px;">Your Premium Perks are Now Active:</h4>
        <ul style="color: #334155; line-height: 1.6; padding-left: 20px; margin-top: 0;">
          <li>🤖 <strong>24/7 TutorBot AI Access</strong> (Unlimited Q&A for SSC, HSC, O/A-Level & Admissions)</li>
          <li>🎁 <strong>Reward Points Allocated</strong> (${planType === "yearly" ? "500" : "50"} points added to your account)</li>
          <li>⚡ <strong>Priority Tutor Connect & Booking Discounts</strong></li>
        </ul>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">This is an automated receipt from Tutor-Connect. If you have questions, contact support.</p>
        <p style="margin: 4px 0 0 0;">© 2026 Tutor-Connect Bangladesh. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Tutor-Connect Payments" <${user}>`,
      to: email,
      subject: `🎉 Payment Receipt - Tutor-Connect Premium (${transactionId})`,
      html,
    });
    console.log(`[Email Receipt] Successfully sent to ${email}`);
  } catch (err) {
    console.error(`[Email Receipt] Failed to send email to ${email}:`, err);
  }
}
