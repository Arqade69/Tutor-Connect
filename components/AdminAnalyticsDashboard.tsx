"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsersTable, type AdminUser } from "@/components/UsersTable";
import { TutorVerifications, type AdminTutorProfile } from "@/components/TutorVerifications";
import { adminUpdateSystemSettings, type MonthlyBookingStat, type MonthlyRevenueStat, type SystemMonitoringHealth } from "@/actions/admin";
import { asFormAction } from "@/components/form";

export type AdminAnalyticsDashboardProps = {
  systemSettings: {
    rewardPointRate: number;
    rewardPointsPerBooking: number;
    premiumMonthlyPrice: number;
    premiumAnnualPrice: number;
    platformCommissionRate: number;
    updatedAt: Date | string;
  };
  userCounts: {
    total: number;
    students: number;
    parents: number;
    tutors: number;
    admins: number;
    premium: number;
    suspended: number;
    flagged: number;
  };
  monthlyBookingsStats: MonthlyBookingStat[];
  revenueStats: {
    totalRevenue: number;
    historicalPaymentsRevenue: number;
    projectedActivePremiumRevenue: number;
    monthlyRevenueStats: MonthlyRevenueStat[];
    activePremiumUsers: number;
    monthlyPrice: number;
    annualPrice: number;
  };
  pendingVerificationsCount: number;
  systemHealth: SystemMonitoringHealth;
  users: AdminUser[];
  tutors: AdminTutorProfile[];
};

export type AdminTab = "overview" | "analytics" | "users" | "verifications" | "settings" | "monitoring";

export function AdminAnalyticsDashboard({
  systemSettings,
  userCounts,
  monthlyBookingsStats,
  revenueStats,
  pendingVerificationsCount,
  systemHealth,
  users,
  tutors,
}: AdminAnalyticsDashboardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = (searchParams.get("tab") as AdminTab) || "overview";
  const [activeTab, setActiveTab] = useState<AdminTab>(tabFromUrl);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    router.push(`/dashboard/admin?tab=${tab}`, { scroll: false });
  };

  // Calculate booking growth metric
  const currentMonthBookings = monthlyBookingsStats.length > 0 ? monthlyBookingsStats[monthlyBookingsStats.length - 1].totalBookings : 0;
  const prevMonthBookings = monthlyBookingsStats.length > 1 ? monthlyBookingsStats[monthlyBookingsStats.length - 2].totalBookings : 0;
  const bookingGrowthPct = prevMonthBookings > 0
    ? Math.round(((currentMonthBookings - prevMonthBookings) / prevMonthBookings) * 100)
    : 0;

  // Max values for chart height calculations
  const maxMonthlyBookings = Math.max(...monthlyBookingsStats.map((s) => s.totalBookings), 1);
  const maxMonthlyRevenue = Math.max(...revenueStats.monthlyRevenueStats.map((s) => s.subscriptionRevenue), 1000);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Admin Control Center & System Monitoring
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              ● System Operational
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Platform health overview, session analytics, revenue tracking, tutor verifications, and user policy enforcement.
          </p>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => handleTabChange("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "overview"
              ? "border-brand-600 text-brand-600 font-semibold"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span>🏠</span> Overview
        </button>

        <button
          onClick={() => handleTabChange("analytics")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "analytics"
              ? "border-brand-600 text-brand-600 font-semibold"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span>📊</span> Analytics & Revenue
        </button>

        <button
          onClick={() => handleTabChange("users")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "users"
              ? "border-brand-600 text-brand-600 font-semibold"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span>🛡️</span> User Policy & Safety
          {userCounts.flagged > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {userCounts.flagged} Flagged
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("verifications")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "verifications"
              ? "border-brand-600 text-brand-600 font-semibold"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span>🎓</span> Tutor Verifications
          {pendingVerificationsCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
              {pendingVerificationsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("settings")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "settings"
              ? "border-brand-600 text-brand-600 font-semibold"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span>⚙️</span> Reward Points & Pricing
        </button>

        <button
          onClick={() => handleTabChange("monitoring")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "monitoring"
              ? "border-brand-600 text-brand-600 font-semibold"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span>⚡</span> System Health
        </button>
      </div>

      {/* Tab 1: Admin Overview */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Priority Alerts */}
          {pendingVerificationsCount > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Action Required: Tutor Verification Requests</h4>
                  <p className="text-xs text-amber-800">
                    There are <strong>{pendingVerificationsCount}</strong> new tutor registrations waiting for credential evaluation and approval.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTabChange("verifications")}
                className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 font-semibold shadow-sm rounded-lg shrink-0"
              >
                Review Verifications →
              </button>
            </div>
          )}

          {userCounts.flagged > 0 && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">Policy Violations Alert</h4>
                  <p className="text-xs text-rose-800">
                    <strong>{userCounts.flagged}</strong> user accounts are currently flagged for policy review or suspended.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTabChange("users")}
                className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-2 font-semibold shadow-sm rounded-lg shrink-0"
              >
                Manage Policy Violations →
              </button>
            </div>
          )}

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5 border border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{userCounts.total}</p>
              <div className="mt-2 text-xs text-slate-500">
                <span>Students: {userCounts.students}</span> • <span>Tutors: {userCounts.tutors}</span>
              </div>
            </div>

            <div className="card p-5 border border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sessions Booked / Mo</span>
              <p className="mt-2 text-3xl font-extrabold text-emerald-700">{currentMonthBookings}</p>
              <p className="mt-2 text-xs text-slate-500">{bookingGrowthPct >= 0 ? `+${bookingGrowthPct}%` : `${bookingGrowthPct}%`} growth this month</p>
            </div>

            <div className="card p-5 border border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Premium Revenue</span>
              <p className="mt-2 text-3xl font-extrabold text-amber-700">৳{revenueStats.totalRevenue.toLocaleString()}</p>
              <p className="mt-2 text-xs text-slate-500">{revenueStats.activePremiumUsers} active subscribers</p>
            </div>

            <div className="card p-5 border border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System Latency</span>
              <p className="mt-2 text-3xl font-extrabold text-brand-700">{systemHealth.dbLatencyMs} ms</p>
              <p className="mt-2 text-xs text-emerald-700 font-medium">● DB Healthy & Connected</p>
            </div>
          </div>

          {/* Hub Module Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card p-6 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-2xl">📊</span>
                <h3 className="font-bold text-slate-900 text-base mt-2">Analytics & Financial Performance</h3>
                <p className="text-xs text-slate-500 mt-1">
                  View interactive monthly session booking trends, subscription payment history, and revenue metrics.
                </p>
              </div>
              <button
                onClick={() => handleTabChange("analytics")}
                className="btn btn-brand text-xs py-2 w-full font-semibold"
              >
                View Analytics & Revenue →
              </button>
            </div>

            <div className="card p-6 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-2xl">🎓</span>
                <h3 className="font-bold text-slate-900 text-base mt-2">Tutor Verification Management</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Approve or reject tutor applications, inspect hourly fees, subjects, and educator credentials.
                </p>
              </div>
              <button
                onClick={() => handleTabChange("verifications")}
                className="btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs py-2 w-full font-semibold"
              >
                Tutor Verification Center ({pendingVerificationsCount}) →
              </button>
            </div>

            <div className="card p-6 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-2xl">⚙️</span>
                <h3 className="font-bold text-slate-900 text-base mt-2">Reward Points & Pricing Settings</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure student reward point conversion rates, monthly/annual premium pricing, and platform commission.
                </p>
              </div>
              <button
                onClick={() => handleTabChange("settings")}
                className="btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs py-2 w-full font-semibold"
              >
                Configure System Pricing →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Analytics & Revenue */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Registered Users */}
            <div className="card p-5 border border-brand-100 bg-gradient-to-br from-white to-brand-50/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                  Total Registered Users
                </span>
                <span className="rounded-lg bg-brand-100 p-2 text-brand-700">👥</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">{userCounts.total}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>🎓 <strong>{userCounts.students}</strong> Students</span>
                <span>•</span>
                <span>🧑‍🏫 <strong>{userCounts.tutors}</strong> Tutors</span>
                <span>•</span>
                <span>👨‍👩‍👧 <strong>{userCounts.parents}</strong> Parents</span>
              </div>
            </div>

            {/* Total Sessions Booked */}
            <div className="card p-5 border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Sessions Booked / Mo
                </span>
                <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700">📅</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">{currentMonthBookings}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <span>{bookingGrowthPct >= 0 ? `↑ +${bookingGrowthPct}%` : `↓ ${bookingGrowthPct}%`} vs last month</span>
                <span className="text-slate-400">({systemHealth.totalBookings} overall)</span>
              </div>
            </div>

            {/* Total Premium Revenue */}
            <div className="card p-5 border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Total Premium Revenue
                </span>
                <span className="rounded-lg bg-amber-100 p-2 text-amber-700">💎</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                ৳ {revenueStats.totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">BDT</span>
              </p>
              <div className="mt-2 text-xs text-slate-600">
                <strong>{revenueStats.activePremiumUsers}</strong> Active Premium Members (৳{revenueStats.monthlyPrice}/mo)
              </div>
            </div>

            {/* Tutor Verifications */}
            <div className="card p-5 border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  Tutor Verifications
                </span>
                <span className="rounded-lg bg-purple-100 p-2 text-purple-700">📜</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">{pendingVerificationsCount}</p>
              <div className="mt-2 text-xs text-slate-600">
                Pending evaluation out of <strong>{userCounts.tutors}</strong> registered tutors
              </div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Monthly Sessions Booked Trend Chart */}
            <div className="card p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">Total Sessions Booked Per Month</h3>
                  <p className="text-xs text-slate-500">Session reservations distribution over the past 6 months</p>
                </div>
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                  Monthly Booking Trend
                </span>
              </div>

              {monthlyBookingsStats.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                  No booking data available yet.
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  <div className="flex h-48 items-end gap-3 sm:gap-4 pt-6 pb-2 border-b border-slate-200 px-2">
                    {monthlyBookingsStats.map((stat) => {
                      const heightPercent = Math.max(Math.round((stat.totalBookings / maxMonthlyBookings) * 100), 12);
                      const completedPercent = stat.totalBookings > 0 ? Math.round((stat.completedBookings / stat.totalBookings) * 100) : 0;
                      return (
                        <div key={stat.monthKey} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-10">
                            {stat.label}: {stat.totalBookings} sessions ({stat.completedBookings} completed)
                          </div>

                          <span className="text-xs font-bold text-slate-700">{stat.totalBookings}</span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 relative overflow-hidden transition-all duration-300 group-hover:from-brand-700 group-hover:to-brand-500 shadow-sm"
                          >
                            <div
                              style={{ height: `${completedPercent}%` }}
                              className="w-full bg-emerald-500/80 absolute bottom-0 transition-all"
                              title={`${completedPercent}% Completed`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-xs font-medium text-slate-500 px-2">
                    {monthlyBookingsStats.map((stat) => (
                      <span key={stat.monthKey} className="text-center flex-1">{stat.label}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-brand-500 inline-block" /> Total Booked
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-emerald-500 inline-block" /> Completed
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Total Revenue Generated from Premium Subscriptions Chart */}
            <div className="card p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">Premium Subscription Revenue</h3>
                  <p className="text-xs text-slate-500">Monthly subscription payments & premium plan revenue in BDT</p>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  ৳ {revenueStats.totalRevenue.toLocaleString()} BDT Total
                </span>
              </div>

              {revenueStats.monthlyRevenueStats.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                  No subscription revenue recorded yet.
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  <div className="flex h-48 items-end gap-3 sm:gap-4 pt-6 pb-2 border-b border-slate-200 px-2">
                    {revenueStats.monthlyRevenueStats.map((stat) => {
                      const heightPercent = Math.max(Math.round((stat.subscriptionRevenue / maxMonthlyRevenue) * 100), 10);
                      return (
                        <div key={stat.monthKey} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-10">
                            {stat.label}: ৳{stat.subscriptionRevenue.toLocaleString()} ({stat.paymentCount} payments)
                          </div>

                          <span className="text-[11px] font-bold text-slate-700">৳{stat.subscriptionRevenue}</span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300 group-hover:from-amber-700 group-hover:to-amber-500 shadow-sm"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-xs font-medium text-slate-500 px-2">
                    {revenueStats.monthlyRevenueStats.map((stat) => (
                      <span key={stat.monthKey} className="text-center flex-1">{stat.label}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-600 border-t border-slate-100">
                    <span>Active Plan: <strong>৳{revenueStats.monthlyPrice}/mo</strong></span>
                    <span>Active Subscribers: <strong>{revenueStats.activePremiumUsers}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Breakdown & Safety Summary Card */}
          <div className="card p-6 shadow-sm border border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-4">Platform User Demographics & Safety Metrics</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Students</p>
                <p className="text-2xl font-bold text-brand-700 mt-1">{userCounts.students}</p>
                <p className="text-[11px] text-slate-400">Registered learners</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tutors</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{userCounts.tutors}</p>
                <p className="text-[11px] text-slate-400">Instructors & Educators</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parents</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{userCounts.parents}</p>
                <p className="text-[11px] text-slate-400">Guardian accounts</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Flagged & Suspended</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-amber-700">{userCounts.flagged}</span>
                  <span className="text-xs text-amber-800">flagged</span>
                  <span className="text-2xl font-bold text-rose-700 ml-2">{userCounts.suspended}</span>
                  <span className="text-xs text-rose-800">suspended</span>
                </div>
                <p className="text-[11px] text-amber-700">Requiring policy enforcement</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Policy & Flagged Accounts */}
      {activeTab === "users" && (
        <div className="card p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Account Management & Policy Violation Enforcement</h2>
              <p className="text-xs text-slate-500">
                Flag or suspend accounts that violate platform policies, update roles, toggle premium status, or purge non-compliant profiles.
              </p>
            </div>
            {userCounts.flagged > 0 && (
              <span className="badge bg-amber-100 text-amber-800 font-bold px-3 py-1 text-xs">
                ⚠️ {userCounts.flagged} Flagged Accounts
              </span>
            )}
          </div>
          <UsersTable users={users} />
        </div>
      )}

      {/* Tab 3: Tutor Verifications */}
      {activeTab === "verifications" && (
        <div className="card p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Tutor Verification Requests</h2>
            <p className="text-xs text-slate-500">
              Review qualifications, subjects, and credentials for newly registered tutors before making their profiles public.
            </p>
          </div>
          <TutorVerifications tutors={tutors} />
        </div>
      )}

      {/* Tab 4: System Settings & Pricing */}
      {activeTab === "settings" && (
        <div className="card p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Reward Point Conversion Rates & Subscription Pricing</h2>
            <p className="text-xs text-slate-500">
              Configure system-wide reward points rules, student/tutor premium subscription fees, and platform commission.
            </p>
          </div>

          {settingsSaved && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium flex items-center justify-between">
              <span>✓ System parameters and subscription pricing updated successfully!</span>
              <button onClick={() => setSettingsSaved(false)} className="text-xs text-emerald-700 underline">Dismiss</button>
            </div>
          )}

          <form
            action={asFormAction(adminUpdateSystemSettings)}
            onSubmit={() => setSettingsSaved(true)}
            className="space-y-6 max-w-3xl"
          >
            {/* Reward Points Section */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>🎁</span> Reward Point Conversion Rates
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Point Value Conversion Rate (BDT per Point)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="rewardPointRate"
                    defaultValue={systemSettings.rewardPointRate}
                    className="input w-full"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">1 Reward Point = X BDT discount value on bookings.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reward Points Earned per Completed Booking
                  </label>
                  <input
                    type="number"
                    name="rewardPointsPerBooking"
                    defaultValue={systemSettings.rewardPointsPerBooking}
                    className="input w-full"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Points awarded to student upon session completion.</p>
                </div>
              </div>
            </div>

            {/* Subscription Pricing Section */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>💎</span> Subscription Pricing Configuration
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Premium Subscription Fee (BDT)
                  </label>
                  <input
                    type="number"
                    name="premiumMonthlyPrice"
                    defaultValue={systemSettings.premiumMonthlyPrice}
                    className="input w-full"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Billed monthly for unlimited AI TutorBot & premium features.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Premium Subscription Fee (BDT)
                  </label>
                  <input
                    type="number"
                    name="premiumAnnualPrice"
                    defaultValue={systemSettings.premiumAnnualPrice}
                    className="input w-full"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Discounted annual subscription option.</p>
                </div>
              </div>
            </div>

            {/* Platform Commission Section */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>💼</span> Platform Fee & Commission
              </h3>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Platform Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  name="platformCommissionRate"
                  defaultValue={systemSettings.platformCommissionRate}
                  className="input w-full"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Percentage retained from total session bookings.</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn btn-brand px-6 py-2.5 font-semibold text-sm shadow-md"
              >
                Save System Parameters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 5: System Health & Monitoring */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          <div className="card p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Real-Time System Health & Diagnostics</h2>
                <p className="text-xs text-slate-500">
                  Live PostgreSQL database connectivity, latency metrics, and core data store record counts.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                PostgreSQL Operational ({systemHealth.dbLatencyMs} ms latency)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Users</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{systemHealth.totalUsers}</p>
                <p className="text-[10px] text-slate-400">Total registered</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Tutor Profiles</p>
                <p className="text-xl font-bold text-purple-700 mt-1">{systemHealth.totalTutorProfiles}</p>
                <p className="text-[10px] text-slate-400">Active & pending</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Bookings</p>
                <p className="text-xl font-bold text-brand-700 mt-1">{systemHealth.totalBookings}</p>
                <p className="text-[10px] text-slate-400">Sessions reserved</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Reviews</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{systemHealth.totalReviews}</p>
                <p className="text-[10px] text-slate-400">Feedback left</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Messages</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{systemHealth.totalMessages}</p>
                <p className="text-[10px] text-slate-400">User chat messages</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">TutorBot AI</p>
                <p className="text-xl font-bold text-teal-700 mt-1">{systemHealth.totalBotMessages}</p>
                <p className="text-[10px] text-slate-400">AI responses generated</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <span>Environment: <strong>Production / Next.js Server Components</strong></span>
              <span>Last Health Audit: <strong>{new Date(systemHealth.lastHealthCheck).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
