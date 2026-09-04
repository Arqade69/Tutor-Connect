"use client";

import { useState, useTransition } from "react";
import { getTutorAnalyticsData, type TutorAnalyticsResult } from "@/actions/tutorAnalytics";
import { StarRating } from "@/components/StarRating";

export function TutorAnalyticsDashboard({
  initialData,
}: {
  initialData: TutorAnalyticsResult;
}) {
  const [data, setData] = useState<TutorAnalyticsResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [presetFilter, setPresetFilter] = useState<"all" | "this_year" | "last_6_months" | "last_30_days" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Chart View State
  const [chartView, setChartView] = useState<"monthly" | "yearly">("monthly");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Apply filters
  const handleFilterChange = (
    preset: "all" | "this_year" | "last_6_months" | "last_30_days" | "custom",
    customStart?: string,
    customEnd?: string
  ) => {
    setPresetFilter(preset);
    let start = "";
    let end = "";

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (preset === "this_year") {
      const year = today.getFullYear();
      start = `${year}-01-01`;
      end = `${year}-12-31`;
    } else if (preset === "last_6_months") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      start = sixMonthsAgo.toISOString().split("T")[0];
      end = todayStr;
    } else if (preset === "last_30_days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      start = thirtyDaysAgo.toISOString().split("T")[0];
      end = todayStr;
    } else if (preset === "custom") {
      start = customStart ?? startDate;
      end = customEnd ?? endDate;
    }

    if (preset !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }

    startTransition(async () => {
      const res = await getTutorAnalyticsData({
        startDate: start || undefined,
        endDate: end || undefined,
      });
      setData(res);
    });
  };

  if (data.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">{data.error}</p>
      </div>
    );
  }

  if (data.isVerified === false) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Tutor Performance Analytics</h1>
          <p className="mt-1 text-slate-500">Track your tutoring session metrics, earnings, and ratings.</p>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m0-6h4m-2 0V9m0 0V7m0 2h2m-2 0H10m-4 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Verification Pending</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Your tutor profile is currently <strong>{data.verificationStatus || "pending"}</strong>. Private performance analytics and earnings reporting are unlocked automatically once your tutor profile is verified by an administrator.
          </p>
          <div className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-semibold text-amber-800">
              ● Verification Status: {data.verificationStatus?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const summary = data.summary || {
    totalEarnings: 0,
    totalCompletedSessions: 0,
    totalConfirmedSessions: 0,
    totalPendingSessions: 0,
    averageRating: 0,
    totalReviews: 0,
    totalStars: 0,
  };

  const peakDemand = data.peakDemand || {
    topDay: "N/A",
    topDayCount: 0,
    topTimeSlot: "N/A",
    topTimeSlotCount: 0,
    peakMonth: "N/A",
    peakMonthCount: 0,
    daysBreakdown: [],
    timeSlotsBreakdown: [],
  };

  const monthlyMetrics = data.monthlyMetrics || [];
  const yearlyMetrics = data.yearlyMetrics || [];
  const ratingTrends = data.ratingTrends || [];
  const reviews = data.reviews || [];

  const displayChartData = chartView === "monthly" ? monthlyMetrics : yearlyMetrics;
  const maxSessions = Math.max(...displayChartData.map((d) => d.sessions), 1);
  const maxEarnings = Math.max(...displayChartData.map((d) => d.earnings), 1);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Private tutor dashboard for session metrics, total earnings, ratings & demand trends.
          </p>
        </div>

        {/* Base Rate Indicator */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="text-slate-500">Hourly Rate:</span>
          <span className="font-bold text-brand-600">৳ {data.hourlyFee} / hr</span>
        </div>
      </div>

      {/* Filter & Period Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Range:
            </span>
            {(
              [
                { id: "all", label: "All Time" },
                { id: "this_year", label: "This Year" },
                { id: "last_6_months", label: "Last 6 Months" },
                { id: "last_30_days", label: "Last 30 Days" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleFilterChange(preset.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  presetFilter === preset.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs (If custom preset active) */}
          {presetFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange("custom", e.target.value, endDate);
                }}
                className="input py-1 text-xs"
                placeholder="Start Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange("custom", startDate, e.target.value);
                }}
                className="input py-1 text-xs"
                placeholder="End Date"
              />
            </div>
          )}

          {/* Granularity Toggle */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              View:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setChartView("monthly")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  chartView === "monthly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setChartView("yearly")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  chartView === "yearly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="mt-2 text-right text-xs font-medium text-brand-600 animate-pulse">
            Updating metrics...
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Earnings */}
        <div className="card relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-50 opacity-60" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Earnings
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-bold">
              ৳
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            ৳ {summary.totalEarnings.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sum of completed session fees
          </p>
        </div>

        {/* Card 2: Completed Sessions */}
        <div className="card relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-blue-50 opacity-60" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sessions Completed
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {summary.totalCompletedSessions}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.totalConfirmedSessions} confirmed • {summary.totalPendingSessions} pending
          </p>
        </div>

        {/* Card 3: Average Rating */}
        <div className="card relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-amber-50 opacity-60" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Average Rating
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 font-bold">
              ★
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">
              {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "N/A"}
            </p>
            <span className="text-sm font-semibold text-amber-500">
              {"★".repeat(Math.round(summary.averageRating))}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {summary.totalStars} stars / {summary.totalReviews} reviews received
          </p>
        </div>

        {/* Card 4: Peak Demand Period */}
        <div className="card relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-purple-50 opacity-60" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Peak Demand Period
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">
            {peakDemand.topDay}
          </p>
          <p className="text-xs font-semibold text-purple-700">
            Slot: {peakDemand.topTimeSlot}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Peak month: {peakDemand.peakMonth}
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Sessions & Earnings Interactive Chart (2 Columns) */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Completed Sessions & Earnings ({chartView === "monthly" ? "By Month" : "By Year"})
              </h2>
              <p className="text-xs text-slate-500">
                Visualizing volume and total fees earned over time
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-brand-600" /> Sessions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Earnings (৳)
              </span>
            </div>
          </div>

          {displayChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
              No completed sessions data available for this range.
            </div>
          ) : (
            <div className="mt-6">
              {/* SVG / Bar Chart Representation */}
              <div className="relative h-64 w-full border-b border-slate-200">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between opacity-30">
                  <div className="w-full border-b border-dashed border-slate-300" />
                  <div className="w-full border-b border-dashed border-slate-300" />
                  <div className="w-full border-b border-dashed border-slate-300" />
                  <div className="w-full border-b border-dashed border-slate-300" />
                </div>

                {/* Bars Container */}
                <div className="absolute inset-0 flex items-end justify-around px-2 pt-6">
                  {displayChartData.map((item, idx) => {
                    const sessionHeight = Math.max((item.sessions / maxSessions) * 85, 8);
                    const earningsHeight = Math.max((item.earnings / maxEarnings) * 85, 8);

                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={item.key}
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                        className="group relative flex h-full flex-1 cursor-pointer items-end justify-center gap-1 px-1"
                      >
                        {/* Tooltip on hover */}
                        {isHovered && (
                          <div className="absolute -top-14 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg">
                            <p className="font-bold">{item.label}</p>
                            <p className="text-brand-300">{item.sessions} session(s)</p>
                            <p className="text-emerald-400">৳ {item.earnings.toLocaleString()}</p>
                          </div>
                        )}

                        {/* Session Bar */}
                        <div
                          style={{ height: `${sessionHeight}%` }}
                          className="w-full max-w-[20px] rounded-t bg-brand-600 transition-all duration-300 group-hover:bg-brand-500"
                        />
                        {/* Earnings Bar */}
                        <div
                          style={{ height: `${earningsHeight}%` }}
                          className="w-full max-w-[20px] rounded-t bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-Axis Labels */}
              <div className="mt-2 flex justify-around px-2 text-center text-[11px] font-medium text-slate-500">
                {displayChartData.map((item) => (
                  <div key={item.key} className="flex-1 truncate px-0.5">
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rating Trend & Distribution (1 Column) */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900">Average Rating Trends</h2>
          <p className="text-xs text-slate-500">Derived from stars / total reviews</p>

          <div className="mt-4 rounded-xl bg-amber-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-amber-900">
                  {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "0.0"}
                </span>
                <span className="ml-1.5 text-sm text-amber-700">out of 5.0</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-amber-900">{summary.totalReviews} total reviews</p>
                <p className="text-[11px] text-amber-700">{summary.totalStars} total stars</p>
              </div>
            </div>
          </div>

          {/* Rating Trend Timeline */}
          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Historical Progression
            </h3>
            {ratingTrends.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No ratings recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {ratingTrends.map((rt) => (
                  <div key={rt.key} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{rt.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${(rt.averageRating / 5) * 100}%` }}
                          className="h-full bg-amber-400 rounded-full"
                        />
                      </div>
                      <span className="font-bold text-slate-900">{rt.averageRating.toFixed(1)} ★</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Reviews — anonymous: rating + comment only, no reviewer identity */}
      <div className="card p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Student Reviews</h2>
            <p className="text-xs text-slate-500">
              What students are saying — shown anonymously so feedback stays honest.
            </p>
          </div>
          <span className="badge bg-slate-100 text-slate-600 self-start">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No reviews yet for the selected filter range.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-500">
                    <StarRating value={r.rating} size={16} />
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
                {r.subject && (
                  <span className="badge mt-3 inline-block bg-brand-50 text-brand-700">{r.subject}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak Demand Period Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Day of Week Demand */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Peak Demand by Day</h2>
              <p className="text-xs text-slate-500">Distribution of session bookings across days</p>
            </div>
            <span className="badge bg-purple-50 text-purple-700 font-semibold">
              Top Day: {peakDemand.topDay}
            </span>
          </div>

          <div className="space-y-3">
            {peakDemand.daysBreakdown.map((day) => (
              <div key={day.dayOfWeek} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700">{day.dayOfWeek}</span>
                  <span className="text-slate-500">
                    {day.count} sessions ({day.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${Math.max(day.percentage, day.count > 0 ? 5 : 0)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      day.dayOfWeek === peakDemand.topDay
                        ? "bg-purple-600"
                        : "bg-brand-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Time Slots */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Popular Time Slots</h2>
              <p className="text-xs text-slate-500">Most requested tutoring session hours</p>
            </div>
            <span className="badge bg-blue-50 text-blue-700 font-semibold">
              Peak Slot: {peakDemand.topTimeSlot}
            </span>
          </div>

          {peakDemand.timeSlotsBreakdown.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No time slot data recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {peakDemand.timeSlotsBreakdown.map((slot, idx) => (
                <div
                  key={slot.timeSlot}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-[11px] ${
                        idx === 0
                          ? "bg-amber-400 text-amber-950"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{slot.timeSlot}</span>
                  </div>
                  <span className="badge bg-white text-slate-600 border border-slate-200">
                    {slot.count} booking(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Completed Sessions Table */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Completed Sessions</h2>
            <p className="text-xs text-slate-500">Fee breakdowns of recent completed sessions</p>
          </div>
          <span className="text-xs font-semibold text-brand-600">
            Showing up to 10 sessions
          </span>
        </div>

        {!data.recentCompletedSessions || data.recentCompletedSessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No completed sessions found for the selected filter range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Earned Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentCompletedSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {session.date}
                      <span className="ml-1.5 text-[11px] text-slate-400">({session.dayOfWeek})</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{session.studentName}</p>
                      <p className="text-[11px] text-slate-400">{session.studentEmail}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-brand-50 text-brand-700">{session.subject}</span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {session.bookingType.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {session.durationHours} hr(s)
                      <span className="ml-1 text-[11px] text-slate-400">
                        ({session.startTime}-{session.endTime})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      ৳ {session.fee.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
