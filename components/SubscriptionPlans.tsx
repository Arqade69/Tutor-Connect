"use client";

import { useState, useTransition } from "react";
import { initiateUddoktaPay, PlanType } from "@/actions/subscription";

interface SubscriptionPlansProps {
  currentPlan: string;
  isPremium: boolean;
  expiresAt?: string | null;
  rewardPoints: number;
  pointsPerTaka: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
}

export function SubscriptionPlans({
  currentPlan,
  isPremium,
  expiresAt,
  rewardPoints,
  pointsPerTaka,
  monthlyPrice = 150,
  yearlyPrice = 1500,
}: SubscriptionPlansProps) {
  const [billingCycle, setBillingCycle] = useState<PlanType>("monthly");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [usePoints, setUsePoints] = useState(false);
  const [redeemSlider, setRedeemSlider] = useState(0);

  const baseAmount = billingCycle === "yearly" ? yearlyPrice : monthlyPrice;
  const maxDiscount = baseAmount - 10; // Minimum ৳10 payable
  const maxRedeemablePoints = Math.min(rewardPoints, maxDiscount * pointsPerTaka);
  const actualRedeem = usePoints ? Math.min(redeemSlider, maxRedeemablePoints) : 0;
  const discountTaka = Math.floor(actualRedeem / pointsPerTaka);
  const finalAmount = baseAmount - discountTaka;

  const handleSelectPlan = (planType: PlanType) => {
    setErrorMsg("");
    startTransition(async () => {
      const res = await initiateUddoktaPay(planType, actualRedeem);
      if (res.ok && res.paymentUrl) {
        // Redirect browser to UddoktaPay hosted secure checkout
        window.location.href = res.paymentUrl;
      } else {
        setErrorMsg(res.error || "Failed to launch UddoktaPay payment gateway.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-xl bg-slate-100 p-1.5 border border-slate-200">
          <button
            onClick={() => { setBillingCycle("monthly"); setRedeemSlider(0); }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              billingCycle === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly Billing (৳{monthlyPrice.toLocaleString()}/mo)
          </button>
          <button
            onClick={() => { setBillingCycle("yearly"); setRedeemSlider(0); }}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              billingCycle === "yearly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Yearly Billing (৳{yearlyPrice.toLocaleString()}/yr)</span>
            {yearlyPrice < monthlyPrice * 12 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Save ৳{(monthlyPrice * 12 - yearlyPrice).toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Free Plan Card */}
        <div className="card relative flex flex-col justify-between p-7 border-slate-200 bg-white">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Free Starter</h3>
              {!isPremium && (
                <span className="badge bg-slate-100 text-slate-700">Current Plan</span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Basic tutoring search and direct booking for students and parents.
            </p>
            <div className="my-6">
              <span className="text-4xl font-black text-slate-900">৳0</span>
              <span className="text-sm font-medium text-slate-500"> / forever</span>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-600">
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                Search verified tutors by subject & location
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                View complete tutor profiles & reviews
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                Book 1-on-1 tutoring sessions directly
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                Direct chat with booked tutors
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">✕</span>
                TutorBot AI (Limited to 5 Q&A per day)
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">✕</span>
                Reward-point booking discounts
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button
              disabled={!isPremium}
              className="btn-secondary w-full py-3 text-center"
            >
              {!isPremium ? "Active Plan" : "Included in Free"}
            </button>
          </div>
        </div>

        {/* Premium Plan Card */}
        <div className="card relative flex flex-col justify-between p-7 border-2 border-brand-500 bg-gradient-to-b from-brand-50/40 via-white to-white shadow-lg">
          <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
            Recommended
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Premium Pro</span>
                <span className="text-amber-500">👑</span>
              </h3>
              {isPremium && (
                <span className="badge bg-brand-100 text-brand-700 font-semibold">Active Plan</span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Unlimited 24/7 AI Study Assistant, exam prep, and reward discounts.
            </p>

            <div className="my-6">
              {discountTaka > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">
                    ৳{finalAmount.toLocaleString()}
                  </span>
                  <span className="text-lg font-semibold text-slate-400 line-through">
                    ৳{baseAmount.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {billingCycle === "yearly" ? " / year" : " / month"}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-4xl font-black text-slate-900">
                    ৳{baseAmount.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {billingCycle === "yearly" ? " / year" : " / month"}
                  </span>
                </>
              )}
            </div>

            {/* Payment Options Badges */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                Accepted Payment Channels via UddoktaPay
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-pink-100 px-2 py-0.5 text-xs font-bold text-[#E2136E]">bKash</span>
                <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">Nagad</span>
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">Rocket</span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">Upay</span>
                <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">Visa / Mastercard</span>
              </div>
            </div>

            {/* Reward Points Redemption Section */}
            {isPremium && rewardPoints > 0 && (
              <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <span className="text-sm font-bold text-amber-900">Redeem Reward Points</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => {
                        setUsePoints(e.target.checked);
                        if (!e.target.checked) setRedeemSlider(0);
                        else setRedeemSlider(maxRedeemablePoints);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <p className="text-xs text-amber-800 mb-3">
                  You have <strong>{rewardPoints.toLocaleString()}</strong> points.
                  Rate: <strong>{pointsPerTaka} pts = ৳1</strong> discount.
                </p>

                {usePoints && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={maxRedeemablePoints}
                      step={pointsPerTaka}
                      value={redeemSlider}
                      onChange={(e) => setRedeemSlider(Number(e.target.value))}
                      className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-amber-800">
                        Using: <strong>{actualRedeem.toLocaleString()}</strong> pts
                      </span>
                      <span className="text-emerald-700">
                        Discount: <strong>৳{discountTaka}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ul className="space-y-3.5 text-sm text-slate-700">
              <li className="flex items-center gap-3 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs">✓</span>
                All Free features included
              </li>
              <li className="flex items-center gap-3 font-semibold text-brand-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs">✓</span>
                24/7 Unlimited TutorBot AI Study Assistant
              </li>
              <li className="flex items-center gap-3 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs">✓</span>
                SSC, HSC, O/A-Level & Admission exam assistance
              </li>
              <li className="flex items-center gap-3 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs">✓</span>
                Earn bonus Reward Points per subscription renewal
              </li>
              <li className="flex items-center gap-3 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs">✓</span>
                Earn points for bookings, sessions & reviews
              </li>
              <li className="flex items-center gap-3 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs">✓</span>
                Redeem points for subscription discounts
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleSelectPlan(billingCycle)}
              disabled={isPending}
              className="btn-primary w-full py-3 text-center font-bold text-base shadow-md hover:shadow-lg transition"
            >
              {isPending
                ? "Launching UddoktaPay Gateway..."
                : isPremium
                ? discountTaka > 0
                  ? `Extend Premium — Pay ৳${finalAmount.toLocaleString()} (৳${discountTaka} off)`
                  : "Extend Premium Subscription"
                : `Pay ৳${baseAmount.toLocaleString()} via UddoktaPay`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
