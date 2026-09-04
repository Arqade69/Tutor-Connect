import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getRewardSettings } from "@/actions/rewards";
import { RewardSettingsForm } from "./RewardSettingsForm";

export const dynamic = "force-dynamic";

export default async function RewardSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  const settings = await getRewardSettings();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span>🎁</span>
          <span>Reward Points Settings</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure how reward points are earned and converted to subscription discounts.
        </p>
      </header>

      {/* Conversion Rate Explanation */}
      <div className="card p-6 border-l-4 border-brand-500 bg-brand-50/30">
        <h3 className="font-semibold text-slate-900 mb-1">How the conversion works</h3>
        <p className="text-sm text-slate-600">
          When <strong>Points per Taka</strong> is set to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">20</code>,
          a user needs <strong>20 points</strong> to get <strong>৳1</strong> off their next subscription renewal.
          <br />
          Example: 500 points ÷ 20 = <strong>৳25 discount</strong>.
        </p>
      </div>

      <RewardSettingsForm settings={settings} />
    </div>
  );
}
