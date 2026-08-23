"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchTutors, type TutorFilterInput } from "@/actions/tutorSearch";
import { getOrCreateConversation } from "@/actions/chat";
import { TutorMapDiscovery, type TutorMapItem } from "@/components/TutorMapDiscovery";
import { DISTRICT_COORDINATES, formatDistance } from "@/lib/location";
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

export function TutorSearchClient({
  initialTutors,
}: {
  initialTutors: TutorMapItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core Tutor State
  const [tutors, setTutors] = useState<TutorMapItem[]>(initialTutors);

  // View Mode: 'split' (Map + List side-by-side) | 'map' (Full Map) | 'list' (Cards Grid)
  const [viewMode, setViewMode] = useState<"split" | "map" | "list">("split");

  // Filters State
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All");
  const [classLevel, setClassLevel] = useState("All");
  const [district, setDistrict] = useState("All");
  const [medium, setMedium] = useState("All");
  const [dayOfWeek, setDayOfWeek] = useState("All");
  const [maxFee, setMaxFee] = useState<number>(3000);
  const [minRating, setMinRating] = useState<number>(0);

  // Geospatial Search State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25);
  const [sortBy, setSortBy] = useState<"rating" | "distance" | "fee_asc" | "fee_desc">("rating");

  // Map Center & Selected Tutor
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DISTRICT_COORDINATES["Dhaka"]);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);

  // Apply filters via server action
  const applyFilters = useCallback(() => {
    startTransition(async () => {
      const results = await searchTutors({
        query,
        subject,
        classLevel,
        district,
        medium,
        dayOfWeek,
        maxFee: maxFee < 3000 ? maxFee : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
        maxDistanceKm: userLocation ? maxDistanceKm : undefined,
        sortBy,
      });
      setTutors(results as TutorMapItem[]);
    });
  }, [
    query,
    subject,
    classLevel,
    district,
    medium,
    dayOfWeek,
    maxFee,
    minRating,
    userLocation,
    maxDistanceKm,
    sortBy,
  ]);

  useEffect(() => {
    applyFilters();
  }, [
    subject,
    classLevel,
    district,
    medium,
    dayOfWeek,
    maxFee,
    minRating,
    userLocation,
    maxDistanceKm,
    sortBy,
    applyFilters,
  ]);

  // Update map center when district changes
  useEffect(() => {
    if (district !== "All" && DISTRICT_COORDINATES[district]) {
      setMapCenter(DISTRICT_COORDINATES[district]);
    } else if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [district, userLocation]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      return;
    }

    setLocationStatus("Locating...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setUserLocation(coords);
        setMapCenter(coords);
        setSortBy("distance");
        setLocationStatus("Location updated!");
        setTimeout(() => setLocationStatus(""), 3000);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        // Fallback to Dhaka center location with friendly feedback
        const fallbackCoords = DISTRICT_COORDINATES["Dhaka"];
        setUserLocation(fallbackCoords);
        setMapCenter(fallbackCoords);
        setSortBy("distance");
        setLocationStatus("Using central location preset.");
        setTimeout(() => setLocationStatus(""), 3000);
      },
      { timeout: 8000 }
    );
  };

  const resetFilters = () => {
    setQuery("");
    setSubject("All");
    setClassLevel("All");
    setDistrict("All");
    setMedium("All");
    setDayOfWeek("All");
    setMaxFee(3000);
    setMinRating(0);
    setUserLocation(null);
    setMaxDistanceKm(25);
    setSortBy("rating");
    setSelectedTutorId(null);
    setMapCenter(DISTRICT_COORDINATES["Dhaka"]);

    startTransition(async () => {
      const results = await searchTutors({});
      setTutors(results as TutorMapItem[]);
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

  const handleTutorCardClick = (tutor: TutorMapItem) => {
    setSelectedTutorId(tutor.id);
    setMapCenter({ lat: tutor.latitude, lng: tutor.longitude });
    if (viewMode === "list") {
      setViewMode("split");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Map Feature Highlight */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-800 via-brand-700 to-indigo-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200 backdrop-blur border border-white/10">
              <SparklesIcon className="h-4 w-4 text-amber-300" /> Location-Based Discovery (Google Maps API)
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Discover Nearby Tutors on Map
            </h1>
            <p className="text-sm text-brand-100 sm:text-base">
              Find verified in-person and online tutors around your locality, district, or GPS location.
              Click map pins to check subjects, ratings, hourly fees, and instant directions.
            </p>
          </div>

          {/* Quick Geolocation Trigger */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
            <button
              onClick={handleUseMyLocation}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 shadow-md hover:shadow-lg"
            >
              <MapPinIcon className="h-5 w-5 text-slate-900" />
              Find Tutors Near Me
            </button>
            {locationStatus && (
              <span className="text-xs text-amber-200 font-medium">{locationStatus}</span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tutor name, subject (e.g. Physics, Higher Math), or area (e.g. Dhanmondi, Gulshan)..."
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

      {/* Control Bar: View Switcher + Sorting + Results Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
            View Mode:
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode("split")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "split"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              🌓 Split View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "map"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              🗺️ Full Map
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              📋 List Only
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="rating">⭐ Highest Rated</option>
              {userLocation && <option value="distance">📍 Closest Distance</option>}
              <option value="fee_asc">💰 Fee: Low to High</option>
              <option value="fee_desc">💎 Fee: High to Low</option>
            </select>
          </div>

          <p className="text-xs font-semibold text-slate-600">
            <span className="font-bold text-slate-900">{tutors.length}</span> tutors
          </p>
        </div>
      </div>

      {/* Main Container */}
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

          {/* District / Area Selector */}
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

          {/* Search Radius (If User Location Set) */}
          {userLocation && (
            <div className="space-y-2 rounded-xl bg-blue-50 p-3 border border-blue-100">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span className="uppercase tracking-wider text-blue-800">Search Radius</span>
                <span className="font-bold text-blue-700">{maxDistanceKm} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-blue-600 font-medium">
                <span>1 km</span>
                <span>25 km</span>
                <span>50 km</span>
              </div>
            </div>
          )}

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

          {/* Minimum Rating */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Minimum Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-brand-500"
            >
              <option value={0}>Any Rating</option>
              <option value={4.5}>4.5★ and above</option>
              <option value={4.0}>4.0★ and above</option>
              <option value={3.5}>3.5★ and above</option>
            </select>
          </div>

          {/* Teaching Medium */}
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

        {/* Content Area: Map / Split / List View */}
        <div className="space-y-6 lg:col-span-3">
          {/* Google Maps Display (Shown in 'split' or 'map' mode) */}
          {viewMode !== "list" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>📍 Interactive Discovery Map</span>
                <span className="text-slate-500 font-normal">Click any pin to inspect tutor details</span>
              </div>
              <TutorMapDiscovery
                tutors={tutors}
                center={mapCenter}
                zoom={district !== "All" ? 13 : 11}
                selectedTutorId={selectedTutorId}
                userLocation={userLocation}
                searchRadiusKm={maxDistanceKm}
                onSelectTutor={(tutor) => setSelectedTutorId(tutor.id)}
                onOpenChat={handleOpenChat}
                onUseMyLocation={handleUseMyLocation}
              />
            </div>
          )}

          {/* Tutor Cards List (Shown in 'split' or 'list' mode) */}
          {viewMode !== "map" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {tutors.length} Verified Tutors {district !== "All" ? `in ${district}` : "Available"}
                </h3>
              </div>

              {tutors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <BookIcon className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-3 text-base font-semibold text-slate-900">No tutors found</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Try expanding your search radius or resetting filter options.
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
                  {tutors.map((tutor) => {
                    const isSelected = selectedTutorId === tutor.id;

                    return (
                      <div
                        key={tutor.id}
                        onClick={() => handleTutorCardClick(tutor)}
                        className={`cursor-pointer flex flex-col justify-between rounded-2xl border p-5 transition shadow-sm hover:shadow-md ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/30 ring-2 ring-brand-500/20"
                            : "border-slate-200/80 bg-white hover:border-slate-300"
                        }`}
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

                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
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

                              {tutor.distanceKm !== undefined && (
                                <div className="mt-1 text-xs font-semibold text-sky-600">
                                  📍 {formatDistance(tutor.distanceKm)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tagline */}
                          <p className="line-clamp-2 text-xs font-medium text-slate-600">
                            {tutor.tagline}
                          </p>

                          {/* Subject & Level Badges */}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenChat(tutor.userId);
                            }}
                            disabled={isPending}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 hover:text-brand-600"
                            title="Chat with Tutor"
                          >
                            <ChatIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
