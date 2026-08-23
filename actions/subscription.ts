"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/session";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { revalidatePath } from "./_shared";
import { awardRewardPoints, getRewardSettingValue } from "./rewards";

export type PlanType = "monthly" | "yearly";

/**
 * Initiates an UddoktaPay Checkout Session.
 * Calls UddoktaPay /api/checkout-v2 and returns the hosted payment gateway URL.
 * Supports optional reward point redemption for a Taka discount.
 */
export async function initiateUddoktaPay(
  planType: PlanType,
  redeemedPoints: number = 0
): Promise<{ ok: boolean; paymentUrl?: string; error?: string }> {
  try {
    const user = await requireUser();
    const baseAmount = planType === "yearly" ? 1500 : 150;

    // Calculate discount from redeemed points
    let discountAmount = 0;
    let actualRedeemed = 0;
    if (redeemedPoints > 0 && user.isPremium) {
      const pointsPerTaka = await getRewardSettingValue("points_per_taka");
      // Cap redemption to user's actual balance
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { rewardPoints: true },
      });
      actualRedeemed = Math.min(redeemedPoints, userRecord?.rewardPoints || 0);
      discountAmount = Math.floor(actualRedeemed / pointsPerTaka);
      // Ensure minimum payable amount of ৳10
      discountAmount = Math.min(discountAmount, baseAmount - 10);
      // Recalculate actual redeemed points based on capped discount
      actualRedeemed = discountAmount * pointsPerTaka;
    }

    const finalAmount = baseAmount - discountAmount;

    // Generate unique internal reference code e.g. UP-891240
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const referenceCode = `UP-${randomCode}`;

    // 1. Create a pending payment log in the database
    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId: user.id,
        planType,
        amount: finalAmount,
        redeemedPoints: actualRedeemed,
        discountAmount,
        referenceCode,
        status: "pending",
      },
    });

    const baseUrl =
      process.env.UDDOKTAPAY_BASE_URL || "https://sandbox.uddoktapay.com";
    const apiKey = process.env.UDDOKTAPAY_API_KEY;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1511";

    if (!apiKey) {
      throw new Error("UddoktaPay API key is not configured in .env");
    }

    // 2. Call UddoktaPay Checkout API (/api/checkout-v2)
    const response = await fetch(`${baseUrl}/api/checkout-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey,
      },
      body: JSON.stringify({
        full_name: user.name || "Student",
        email: user.email,
        amount: finalAmount.toString(),
        metadata: {
          paymentId: payment.id,
          userId: user.id,
          planType,
          redeemedPoints: actualRedeemed,
          discountAmount,
        },
        redirect_url: `${appUrl}/dashboard/subscription/success`,
        cancel_url: `${appUrl}/dashboard/subscription`,
        return_type: "GET",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.payment_url) {
      console.error("[UddoktaPay Checkout Error]:", data);
      throw new Error(
        data.message || "Failed to initiate payment gateway with UddoktaPay."
      );
    }

    return {
      ok: true,
      paymentUrl: data.payment_url,
    };
  } catch (error: any) {
    console.error("initiateUddoktaPay Error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to launch payment checkout.",
    };
  }
}

/**
 * Verifies an UddoktaPay invoice status by calling /api/verify-payment.
 * Upgrades user to Premium when payment status is 'Completed'.
 */
export async function verifyUddoktaPayInvoice(invoiceId: string) {
  try {
    const cleanInvoiceId = invoiceId.trim();

    const baseUrl =
      process.env.UDDOKTAPAY_BASE_URL || "https://sandbox.uddoktapay.com";
    const apiKey = process.env.UDDOKTAPAY_API_KEY;

    if (!apiKey) {
      throw new Error("UddoktaPay API key is missing.");
    }

    // 1. Call UddoktaPay Verify Payment API
    const response = await fetch(`${baseUrl}/api/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey,
      },
      body: JSON.stringify({ invoice_id: cleanInvoiceId }),
    });

    const paymentData = await response.json();
    console.log("[UddoktaPay Verification Response]:", paymentData);

    const isCompleted = paymentData.status?.toUpperCase() === "COMPLETED";

    if (!response.ok || !isCompleted) {
      return {
        ok: false,
        error:
          paymentData.message ||
          `Payment verification failed. Current status: ${paymentData.status || "Pending"}`,
      };
    }

    const metadata = paymentData.metadata || {};
    const paymentId = metadata.paymentId;
    const planType: PlanType = metadata.planType || "monthly";
    const amount = Number(paymentData.amount || paymentData.charged_amount || 150);
    const paymentMethod = paymentData.payment_method || "UddoktaPay";
    const transactionId = paymentData.transaction_id || cleanInvoiceId;

    // Find User from metadata or session
    let userId = metadata.userId;
    if (!userId) {
      const sessionUser = await getCurrentUser();
      userId = sessionUser?.id;
    }

    if (!userId) {
      return { ok: false, error: "User identity could not be verified from payment." };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, error: "User account not found." };
    }

    // 2. Check if payment record exists in DB
    let paymentRecord = paymentId
      ? await prisma.subscriptionPayment.findUnique({
          where: { id: paymentId },
          include: { user: true },
        })
      : null;

    if (!paymentRecord) {
      paymentRecord = await prisma.subscriptionPayment.findFirst({
        where: { userId: user.id, status: "pending" },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });
    }

    // Idempotency check: If this payment has already been verified, return success without re-processing
    if (paymentRecord && paymentRecord.status === "verified") {
      return { ok: true, verified: true };
    }

    // Calculate expiration date: extend from existing expiry date if currently active
    const durationDays = planType === "yearly" ? 365 : 30;
    const now = new Date();
    const currentExpiry = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
    const baseDate =
      user.isPremium && currentExpiry && currentExpiry > now ? currentExpiry : now;

    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const bonusPoints = planType === "yearly" ? 500 : 50;

    // 3. Atomically update DB in transaction
    if (paymentRecord) {
      await prisma.$transaction([
        prisma.subscriptionPayment.update({
          where: { id: paymentRecord.id },
          data: {
            status: "verified",
            invoiceId: cleanInvoiceId,
            transactionId,
            paymentMethod,
            rawPayload: JSON.stringify(paymentData),
            verifiedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            isPremium: true,
            subscriptionPlan: planType,
            premiumExpiresAt: expiresAt,
            rewardPoints: { increment: bonusPoints },
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id,
            type: "subscription_success",
            title: "🎉 Premium Activated!",
            message: `Your ${planType === "yearly" ? "Yearly" : "Monthly"} Premium plan is now active via ${paymentMethod}!`,
          },
        }),
      ]);
    } else {
      // Fallback: update user directly if pending log wasn't found
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            isPremium: true,
            subscriptionPlan: planType,
            premiumExpiresAt: expiresAt,
            rewardPoints: { increment: bonusPoints },
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id,
            type: "subscription_success",
            title: "🎉 Premium Activated!",
            message: `Your ${planType === "yearly" ? "Yearly" : "Monthly"} Premium plan is active!`,
          },
        }),
      ]);
    }

    // 4. Deduct redeemed points and log redemption
    const redeemedPts = Number(metadata.redeemedPoints || 0);
    const discount = Number(metadata.discountAmount || 0);
    if (redeemedPts > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { rewardPoints: { decrement: redeemedPts } },
        }),
        prisma.rewardLog.create({
          data: {
            userId: user.id,
            points: -redeemedPts,
            action: "discount_redeemed",
            description: `Redeemed ${redeemedPts} points for ৳${discount} discount on ${planType} plan`,
          },
        }),
      ]);
    }

    // 5. Award subscription renewal reward points
    const renewalBonus = planType === "yearly" ? 500 : 50;
    await awardRewardPoints(
      user.id,
      "subscription_renewed",
      `${planType === "yearly" ? "Yearly" : "Monthly"} Premium subscription activated`,
      renewalBonus
    );

    // 6. Send Email Receipt
    if (user.email) {
      await sendPaymentReceiptEmail({
        email: user.email,
        name: user.name || "Student",
        amount,
        planType,
        transactionId,
        expiresAt,
      });
    }

    return { ok: true, verified: true };
  } catch (error: any) {
    console.error("verifyUddoktaPayInvoice Error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to verify payment invoice.",
    };
  }
}

/**
 * Get current user subscription details, plan status, and payment history.
 */
export async function getSubscriptionData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const payments = await prisma.subscriptionPayment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    isPremium: user.isPremium,
    subscriptionPlan: user.subscriptionPlan,
    premiumExpiresAt: user.premiumExpiresAt,
    rewardPoints: user.rewardPoints,
    payments,
  };
}
