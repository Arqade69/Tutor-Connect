"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchTutors, type TutorFilterInput } from "@/actions/tutorSearch";
import { getOrCreateConversation } from "@/actions/chat";
import {
  SUBJECTS,
  CLASS_LEVELS,
  DISTRICTS,
  TEACHING_MEDIUMS,
  DAYS_OF_WEEK,
} from "@/lib/constants";
import {
  SearchIcon,
  FilterIcon,
  StarIcon,
  MapPinIcon,
  BookIcon,
  ChatIcon,
  SparklesIcon,
} from "@/components/icons";

type TutorItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  location: string;
  district: string;
  tagline: string;
  bio?: string | null;
  subjects: string[];
  classLevels: string[];
  medium: string;
  hourlyFee: number;
  verificationStatus: string;
  rating: number;
  reviewCount: number;
  availableDays: string[];
};

export function TutorSearchClient({
  initialTutors,
}: {
  initialTutors: TutorItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tutors, setTutors] = useState<TutorItem[]>(initialTutors);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All");
  const [classLevel, setClassLevel] = useState("All");
  const [district, setDistrict] = useState("All");
  const [medium, setMedium] = useState("All");
  const [dayOfWeek, setDayOfWeek] = useState("All");
  const [maxFee, setMaxFee] = useState<number>(3000);

  const applyFilters = () => {
    startTransition(async () => {
      const results = await searchTutors({
        query,
        subject,
        classLevel,
        district,
        medium,
        dayOfWeek,
        maxFee: maxFee < 3000 ? maxFee : undefined,
      });
      setTutors(results);
    });
  };

  useEffect(() => {
    applyFilters();
  }, [subject, classLevel, district, medium, dayOfWeek, maxFee]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const resetFilters = () => {
    setQuery("");
    setSubject("All");
    setClassLevel("All");
    setDistrict("All");
    setMedium("All");
    setDayOfWeek("All");
    setMaxFee(3000);
    startTransition(async () => {
      const results = await searchTutors({});
      setTutors(results);
    });
  };

  const handleOpenChat = async (targetUserId: string) => {
    startTransition(async () => {
      const res = await getOrCreateConversation(targetUserId);
      if (res.conversationId) {
        router.push(`/dashboard/chat?convId=${res.conversationId}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200 backdrop-blur">
            <SparklesIcon className="h-4 w-4 text-amber-300" /> Verified Tutors
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Find & Book Expert Tutors
          </h1>
          <p className="text-sm text-brand-100 sm:text-base">
            Search top qualified tutors by subject, location, hourly fee, and weekly availability.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tutor name, subject, or keyword..."
              className="w-full rounded-xl border-0 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* Main Grid: Filter Sidebar + Results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <FilterIcon className="h-5 w-5 text-brand-600" /> Filters
            </div>
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Reset all
            </button>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="All">All Subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Class Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Class / Level
            </label>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="All">All Levels</option>
              {CLASS_LEVELS.map((cl) => (
                <option key={cl} value={cl}>
                  {cl}
                </option>
              ))}
            </select>
          </div>

          {/* District / Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              District / Area
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="All">All Districts</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Medium */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Teaching Medium
            </label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="All">All Mediums</option>
              {TEACHING_MEDIUMS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available Day
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="All">Any Day</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Fee Range Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span className="uppercase tracking-wider text-slate-500">Max Hourly Fee</span>
              <span className="font-bold text-brand-600">৳{maxFee} / hr</span>
            </div>
            <input
              type="range"
              min={300}
              max={3000}
              step={100}
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        </div>

        {/* Tutor Cards List */}
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-slate-600">
              Showing <span className="font-bold text-slate-900">{tutors.length}</span> verified tutors
            </p>
          </div>

          {tutors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BookIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">No tutors found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try loosening your filters or resetting search parameters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Tutor Header Info */}
                    <div className="flex items-start gap-3">
                      {tutor.image ? (
                        <img
                          src={tutor.image}
                          alt={tutor.name}
                          className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-brand-100"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white ring-2 ring-brand-100 text-lg">
                          {tutor.name[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {tutor.name}
                          </h3>
                          <span className="shrink-0 text-sm font-bold text-brand-700">
                            ৳{tutor.hourlyFee}<span className="text-xs font-normal text-slate-500">/hr</span>
                          </span>
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {tutor.rating} ({tutor.reviewCount})
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
                            {tutor.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tagline */}
                    <p className="line-clamp-2 text-xs font-medium text-slate-600">
                      {tutor.tagline}
                    </p>

                    {/* Subject Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {tutor.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                        >
                          {sub}
                        </span>
                      ))}
                      {tutor.classLevels.map((cl) => (
                        <span
                          key={cl}
                          className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        >
                          {cl}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Link
                      href={`/dashboard/tutors/${tutor.id}`}
                      className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-700"
                    >
                      View & Book
                    </Link>
                    <button
                      onClick={() => handleOpenChat(tutor.userId)}
                      disabled={isPending}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 hover:text-brand-600"
                      title="Chat with Tutor"
                    >
                      <ChatIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
