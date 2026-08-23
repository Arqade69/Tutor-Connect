import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaymentReceiptEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const apiKeyHeader = req.headers.get("rt-uddoktapay-api-key");
    const expectedKey = process.env.UDDOKTAPAY_API_KEY;

    if (expectedKey && apiKeyHeader !== expectedKey) {
      console.warn("[UddoktaPay Webhook] Unauthorized request received with key:", apiKeyHeader);
      return NextResponse.json(
        { success: false, message: "Unauthorized. Invalid API Key." },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log("[UddoktaPay Webhook] IPN Received:", body);

    const { status, invoice_id, transaction_id, payment_method, amount, metadata } = body;

    const isCompleted = status?.toUpperCase() === "COMPLETED";

    if (!isCompleted || !invoice_id) {
      return NextResponse.json(
        { success: false, message: "Transaction not completed or invoice_id missing." },
        { status: 400 }
      );
    }

    const userId = metadata?.userId;
    const planType = metadata?.planType || "monthly";
    const paymentId = metadata?.paymentId;
    const numAmount = Number(amount || 150);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID missing from payment metadata." },
        { status: 400 }
      );
    }

    // Find User
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    // Calculate expiry date
    const durationDays = planType === "yearly" ? 365 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const bonusPoints = planType === "yearly" ? 500 : 50;

    // Update DB
    if (paymentId) {
      await prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: "verified",
          invoiceId: invoice_id,
          transactionId: transaction_id || invoice_id,
          paymentMethod: payment_method || "UddoktaPay",
          rawPayload: JSON.stringify(body),
          verifiedAt: new Date(),
        },
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          subscriptionPlan: planType,
          premiumExpiresAt: expiresAt,
          rewardPoints: { increment: bonusPoints },
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: "subscription_success",
          title: "🎉 Premium Activated!",
          message: `Your ${planType} Premium plan is now active via ${payment_method || "UddoktaPay"}!`,
        },
      }),
    ]);

    // Send Email Receipt
    if (user.email) {
      await sendPaymentReceiptEmail({
        email: user.email,
        name: user.name || "Student",
        amount: numAmount,
        planType,
        transactionId: transaction_id || invoice_id,
        expiresAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: "UddoktaPay payment verified and user upgraded successfully.",
    });
  } catch (error: any) {
    console.error("[UddoktaPay Webhook Error]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error processing UddoktaPay webhook." },
      { status: 500 }
    );
  }
}
