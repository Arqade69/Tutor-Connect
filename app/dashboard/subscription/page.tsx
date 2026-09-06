import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSubscriptionData } from "@/actions/subscription";
import { getRewardLogs, getRewardSettingValue } from "@/actions/rewards";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  booking_created: { label: "Session Booked", icon: "📅", color: "text-blue-700 bg-blue-50" },
  session_completed: { label: "Session Completed", icon: "✅", color: "text-emerald-700 bg-emerald-50" },
  review_written: { label: "Review Written", icon: "⭐", color: "text-amber-700 bg-amber-50" },
  subscription_renewed: { label: "Subscription Renewed", icon: "👑", color: "text-purple-700 bg-purple-50" },
  discount_redeemed: { label: "Discount Redeemed", icon: "🎁", color: "text-red-700 bg-red-50" },
};

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard/admin");

  const subData = await getSubscriptionData();
  if (!subData) redirect("/login");

  const [rewardLogs, pointsPerTaka, monthlyPrice, yearlyPrice] = await Promise.all([
    getRewardLogs(user.id),
    getRewardSettingValue("points_per_taka"),
    getRewardSettingValue("premium_monthly_price"),
    getRewardSettingValue("premium_yearly_price"),
  ]);

  const formattedExpiry = subData.premiumExpiresAt
    ? new Date(subData.premiumExpiresAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const takaValue = pointsPerTaka > 0 ? Math.floor(subData.rewardPoints / pointsPerTaka) : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>Subscription & Plans</span>
            {subData.isPremium && (
              <span className="badge bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 text-xs">
                👑 Premium Active
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            Secure 1-click upgrade via UddoktaPay Gateway (bKash, Nagad, Rocket, Cards). Instant activation.
          </p>
        </div>
      </header>


      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Status Tile */}
        <div className="card p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Tier
          </span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xl font-bold text-slate-900 capitalize">
              {subData.isPremium ? `${subData.subscriptionPlan} Premium` : "Free Plan"}
            </span>
            <span
              className={`badge ${
                subData.isPremium
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {subData.isPremium ? "Active" : "Free"}
            </span>
          </div>
        </div>

        {/* Expiration Tile */}
        <div className="card p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Expiration Date
          </span>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {subData.isPremium && formattedExpiry ? formattedExpiry : "No Expiration"}
          </p>
        </div>

        {/* Reward Points Tile */}
        <div className="card p-5 border-amber-200 bg-gradient-to-br from-amber-50/60 to-white">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reward Points
          </span>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-brand-600">
                {subData.rewardPoints.toLocaleString()} Pts
              </span>
              {takaValue > 0 && (
                <span className="ml-2 text-xs font-medium text-emerald-600">
                  (≈ ৳{takaValue} discount)
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {pointsPerTaka} pts = ৳1
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Plans Selection */}
      <section className="card p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900">Choose Your Plan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Unlock 24/7 AI Study Assistant, priority human tutor matching, and bonus reward points.
          </p>
        </div>
        <SubscriptionPlans
          currentPlan={subData.subscriptionPlan}
          isPremium={subData.isPremium}
          expiresAt={subData.premiumExpiresAt?.toISOString()}
          rewardPoints={subData.rewardPoints}
          pointsPerTaka={pointsPerTaka}
          monthlyPrice={monthlyPrice || 150}
          yearlyPrice={yearlyPrice || 1500}
        />
      </section>

      {/* Reward Points Activity Log */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <span>🎯</span> Reward Points Activity Log
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Track how you earn and spend your reward points.
        </p>

        {rewardLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">
              {subData.isPremium
                ? "No reward activity yet. Book a session, complete it, or write a review to start earning points!"
                : "Upgrade to Premium to start earning reward points for your platform activities."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewardLogs.map((log) => {
                  const meta = ACTION_LABELS[log.action] || {
                    label: log.action,
                    icon: "📋",
                    color: "text-slate-700 bg-slate-50",
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
                          <span>{meta.icon}</span>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {log.description}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold font-mono ${
                        log.points > 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {log.points > 0 ? `+${log.points}` : log.points}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payment History Log Table */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">UddoktaPay Transaction Logs</h2>
        {subData.payments.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No payment transactions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference Code</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Invoice / TrxID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subData.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900">
                      {p.referenceCode}
                    </td>
                    <td className="px-4 py-3.5 capitalize font-medium text-slate-700">
                      {p.planType}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      ৳{p.amount}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {p.discountAmount > 0 ? (
                        <span className="text-emerald-600 font-semibold">
                          -৳{p.discountAmount} ({p.redeemedPoints} pts)
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-xs capitalize text-slate-600">
                      {p.paymentMethod || "UddoktaPay"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-brand-600">
                      {p.invoiceId || p.transactionId || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`badge ${
                          p.status === "verified"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
