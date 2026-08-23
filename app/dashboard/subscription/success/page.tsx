import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { verifyUddoktaPayInvoice } from "@/actions/subscription";

export const dynamic = "force-dynamic";

export default async function UddoktaPaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string; invoiceId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const invoiceId = params.invoice_id || params.invoiceId;

  if (!invoiceId) {
    redirect("/dashboard/subscription?error=missing_invoice");
  }

  // Verify the invoice status directly with UddoktaPay API
  const verification = await verifyUddoktaPayInvoice(invoiceId);

  return (
    <div className="mx-auto max-w-xl py-12 px-4">
      <div className="card overflow-hidden p-8 text-center shadow-xl border-emerald-100 bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/30">
        {verification.ok ? (
          <div>
            {/* Celebration Green Checkmark Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <span className="badge bg-emerald-100 text-emerald-800 font-bold px-3 py-1 text-xs">
              UddoktaPay Verified
            </span>

            <h1 className="mt-3 text-3xl font-black text-slate-900">
              Payment Successful!
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Thank you for subscribing to <strong className="text-brand-600">Tutor-Connect Premium</strong>! Your 24/7 TutorBot AI study assistant and reward discounts are now fully active.
            </p>

            <div className="my-6 rounded-2xl border border-slate-200 bg-white p-5 text-left text-xs text-slate-700 shadow-sm space-y-2.5">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Invoice ID:</span>
                <span className="font-mono font-bold text-brand-600">{invoiceId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Account Email:</span>
                <span className="font-semibold text-slate-900">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="badge bg-emerald-100 text-emerald-700 font-bold">COMPLETED</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/subscription"
                className="btn-secondary flex-1 py-3 text-center"
              >
                View Subscription Logs
              </Link>
              <Link
                href="/dashboard/student"
                className="btn-primary flex-1 py-3 text-center font-bold text-base shadow-md hover:shadow-lg transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Error Verification Failed View */
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Verification Pending</h1>
            <p className="mt-2 text-sm text-slate-600">
              {verification.error || "We could not verify your payment invoice at this moment."}
            </p>
            <div className="mt-6">
              <Link href="/dashboard/subscription" className="btn-primary py-2.5 px-6">
                Return to Subscription Page
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
