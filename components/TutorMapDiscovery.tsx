"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistance } from "@/lib/location";
import { StarIcon, MapPinIcon, ChatIcon, SparklesIcon, BookIcon } from "@/components/icons";

declare global {
  interface Window {
    google: any;
  }
}

export type TutorMapItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  location: string;
  district: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
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

type TutorMapDiscoveryProps = {
  tutors: TutorMapItem[];
  center: { lat: number; lng: number };
  zoom?: number;
  selectedTutorId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  locationLabel?: string;
  searchRadiusKm?: number;
  onSelectTutor?: (tutor: TutorMapItem) => void;
  onOpenChat?: (userId: string) => void;
  onUseMyLocation?: () => void;
};

const GOOGLE_MAPS_API_KEY = "AIzaSyAm75ncyIg7WBVHulhoanm6DY44ixfQ2CA";

export function TutorMapDiscovery({
  tutors,
  center,
  zoom = 13,
  selectedTutorId,
  userLocation,
  locationLabel,
  searchRadiusKm = 10,
  onSelectTutor,
  onOpenChat,
  onUseMyLocation,
}: TutorMapDiscoveryProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("roadmap");
  const [activeTutor, setActiveTutor] = useState<TutorMapItem | null>(null);

  // Sync active tutor state with props
  useEffect(() => {
    if (selectedTutorId) {
      const found = tutors.find((t) => t.id === selectedTutorId);
      if (found) setActiveTutor(found);
    }
  }, [selectedTutorId, tutors]);

  // Load Google Maps Script
  useEffect(() => {
    let isMounted = true;

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-maps-api-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (isMounted) setMapLoaded(true);
      });
      existingScript.addEventListener("error", () => {
        if (isMounted) setMapError(true);
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-api-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (isMounted) setMapLoaded(true);
    };

    script.onerror = () => {
      if (isMounted) setMapError(true);
    };

    document.head.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google || !window.google.maps) return;

    try {
      if (!googleMapInstanceRef.current) {
        const mapOptions: any = {
          center: center,
          zoom: zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#e0f2fe" }],
            },
            {
              featureType: "landscape",
              elementType: "geometry",
              stylers: [{ color: "#f8fafc" }],
            },
          ],
        };

        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        googleMapInstanceRef.current = map;
        infoWindowRef.current = new window.google.maps.InfoWindow();
      } else {
        googleMapInstanceRef.current.panTo(center);
        googleMapInstanceRef.current.setZoom(zoom);
      }
    } catch (err) {
      console.error("Error initializing Google Maps:", err);
      setMapError(true);
    }
  }, [mapLoaded, center, zoom]);

  // Update Markers & Radius Overlay on Google Map
  useEffect(() => {
    if (!googleMapInstanceRef.current || !window.google || !window.google.maps) return;

    const map = googleMapInstanceRef.current;

    // Clear previous tutor markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    // Render Active Search Center Pinpoint & Search Range Circle Overlay
    const activeCenter = userLocation || center;

    if (activeCenter) {
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);

      const titleText = locationLabel ? `📍 Center: ${locationLabel}` : "📍 Search Center Pinpoint";

      if (window.google.maps.Marker) {
        userMarkerRef.current = new window.google.maps.Marker({
          position: activeCenter,
          map: map,
          title: titleText,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: "#ea580c", // Vibrant orange pin for search center pinpoint
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
            scale: 1.7,
            anchor: new window.google.maps.Point(12, 22),
          },
        });

        const pinpointInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 6px 8px; text-align: center; max-width: 200px;">
              <div style="font-weight: 700; font-size: 13px; color: #ea580c;">📍 ${locationLabel || "Search Center"}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; background: #fff7ed; padding: 4px 8px; border-radius: 6px; border: 1px solid #ffedd5;">
                ⭕ Range Circle: <strong>${searchRadiusKm} km</strong>
              </div>
            </div>
          `,
        });

        userMarkerRef.current.addListener("click", () => {
          pinpointInfoWindow.open(map, userMarkerRef.current);
        });
      }

      // Draw search radius circle around active center
      if (radiusCircleRef.current) radiusCircleRef.current.setMap(null);

      const circle = new window.google.maps.Circle({
        strokeColor: "#ea580c",
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: "#f97316",
        fillOpacity: 0.18,
        map: map,
        center: activeCenter,
        radius: searchRadiusKm * 1000, // meters
      });

      radiusCircleRef.current = circle;
    }

    // Render Tutor Markers
    tutors.forEach((tutor) => {
      const position = { lat: tutor.latitude, lng: tutor.longitude };
      const isSelected = selectedTutorId === tutor.id || activeTutor?.id === tutor.id;

      // Custom marker icon / pin
      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: tutor.name,
        animation: isSelected ? window.google.maps.Animation.BOUNCE : null,
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: isSelected ? "#4f46e5" : "#0284c7",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: isSelected ? 1.8 : 1.4,
          anchor: new window.google.maps.Point(12, 22),
        },
      });

      marker.addListener("click", () => {
        setActiveTutor(tutor);
        if (onSelectTutor) onSelectTutor(tutor);

        // Open InfoWindow
        const infoContent = `
          <div style="font-family: sans-serif; max-width: 240px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                ${tutor.name[0]?.toUpperCase()}
              </div>
              <div>
                <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${tutor.name}</h4>
                <div style="font-size: 11px; color: #64748b; margin-top: 1px;">📍 ${tutor.location}</div>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; font-size: 12px;">
              <span style="color: #d97706; font-weight: 700;">★ ${tutor.rating} (${tutor.reviewCount})</span>
              <span style="color: #4f46e5; font-weight: 700;">৳${tutor.hourlyFee}/hr</span>
            </div>

            <div style="font-size: 11px; color: #475569; margin-bottom: 8px; font-weight: 500;">
              📚 ${tutor.subjects.slice(0, 3).join(", ")}
              ${tutor.distanceKm !== undefined ? `<br/><span style="color: #0284c7; font-weight: 600;">🚗 ${formatDistance(tutor.distanceKm)}</span>` : ""}
            </div>

            <a href="/dashboard/tutors/${tutor.id}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: #4f46e5; color: white; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;">
              View Profile & Book
            </a>
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
        }

        map.panTo(position);
      });

      markersRef.current.set(tutor.id, marker);
    });
  }, [tutors, selectedTutorId, activeTutor, userLocation, searchRadiusKm]);

  // Center map on selected tutor when updated from parent list click
  useEffect(() => {
    if (!selectedTutorId || !googleMapInstanceRef.current) return;
    const tutor = tutors.find((t) => t.id === selectedTutorId);
    if (tutor) {
      googleMapInstanceRef.current.panTo({ lat: tutor.latitude, lng: tutor.longitude });
      googleMapInstanceRef.current.setZoom(15);
      const marker = markersRef.current.get(tutor.id);
      if (marker && window.google) {
        googleMapInstanceRef.current.panTo(marker.getPosition());
      }
    }
  }, [selectedTutorId, tutors]);

  const toggleMapStyle = () => {
    if (!googleMapInstanceRef.current || !window.google) return;
    const newType = mapType === "roadmap" ? "hybrid" : "roadmap";
    setMapType(newType);
    googleMapInstanceRef.current.setMapTypeId(
      newType === "hybrid"
        ? window.google.maps.MapTypeId.HYBRID
        : window.google.maps.MapTypeId.ROADMAP
    );
  };

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-md">
      {/* Google Map Container */}
      <div ref={mapRef} className="h-full w-full bg-slate-100" />

      {/* Fallback / Loading Overlay with Interactive Radar Range Circle */}
      {(!mapLoaded || mapError) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-between bg-slate-950/95 p-4 text-center backdrop-blur-md text-white overflow-hidden">
          {/* Header Banner */}
          <div className="w-full max-w-xl flex items-center justify-between bg-slate-900/90 rounded-xl p-3 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-sm shadow">
                📍
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Pinpoint: {locationLabel || "Search Center"}</span>
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-400 border border-orange-500/30">
                    ⭕ Circle: {searchRadiusKm} km Range
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Showing {tutors.length} verified tutors within location radius</div>
              </div>
            </div>
            {onUseMyLocation && (
              <button
                onClick={onUseMyLocation}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 transition shadow"
              >
                📍 GPS Pinpoint
              </button>
            )}
          </div>

          {/* Visual SVG Radar Map & Range Circle Canvas */}
          <div className="relative my-2 h-[260px] w-full max-w-md flex items-center justify-center">
            {/* SVG Range Radar Circles */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 240">
              {/* Grid Lines */}
              <line x1="150" y1="20" x2="150" y2="220" stroke="#334155" strokeDasharray="3 3" opacity="0.6" />
              <line x1="20" y1="120" x2="280" y2="120" stroke="#334155" strokeDasharray="3 3" opacity="0.6" />

              {/* Outer Max Range Circle (50 km scale) */}
              <circle cx="150" cy="120" r="105" fill="none" stroke="#1e293b" strokeWidth="1.5" />
              
              {/* Dynamic Range Circle based on searchRadiusKm */}
              {(() => {
                const radiusPx = Math.min(100, Math.max(25, (searchRadiusKm / 50) * 105));
                return (
                  <>
                    {/* Animated Pulsing Fill */}
                    <circle cx="150" cy="120" r={radiusPx} fill="#f97316" fillOpacity="0.12" className="animate-pulse" />
                    {/* Circle Stroke */}
                    <circle cx="150" cy="120" r={radiusPx} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeDasharray="6 3" />
                    {/* Circle Radius Label Badge */}
                    <rect x="150" y={120 - radiusPx - 11} width="60" height="18" rx="9" fill="#ea580c" />
                    <text x="180" y={120 - radiusPx + 2} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                      {searchRadiusKm} km range
                    </text>
                  </>
                );
              })()}

              {/* Center Pinpoint Marker */}
              <circle cx="150" cy="120" r="8" fill="#ea580c" stroke="#ffffff" strokeWidth="2.5" className="shadow-lg" />
              <circle cx="150" cy="120" r="14" fill="#ea580c" fillOpacity="0.3" className="animate-ping" />
              <text x="150" y="142" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                📍 {locationLabel || "Search Center"}
              </text>

              {/* Tutor Markers Positioned in SVG Radar */}
              {tutors.slice(0, 6).map((t, idx) => {
                const dist = t.distanceKm ?? 5;
                const angle = (idx * (360 / Math.min(6, tutors.length)) - 45) * (Math.PI / 180);
                const rScale = Math.min(95, Math.max(20, (dist / 50) * 105));
                const cx = 150 + rScale * Math.cos(angle);
                const cy = 120 + rScale * Math.sin(angle);
                const isSelected = activeTutor?.id === t.id;

                return (
                  <g
                    key={t.id}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => {
                      setActiveTutor(t);
                      if (onSelectTutor) onSelectTutor(t);
                    }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 10 : 7}
                      fill={isSelected ? "#4f46e5" : "#0284c7"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {t.name.split(" ")[0]} ({t.distanceKm ?? 0}km)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick Interactive Tutor Cards Grid */}
          <div className="w-full max-w-xl rounded-xl bg-slate-900/90 p-3 border border-slate-800 text-left space-y-2 max-h-[160px] overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
              <span>Nearby Tutors ({tutors.length})</span>
              <span>Click pin to view</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tutors.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveTutor(t);
                    if (onSelectTutor) onSelectTutor(t);
                  }}
                  className={`cursor-pointer rounded-lg p-2 transition border flex items-center justify-between ${
                    activeTutor?.id === t.id
                      ? "border-orange-500 bg-orange-950/40 ring-1 ring-orange-500"
                      : "border-slate-800 bg-slate-900/70 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shrink-0">
                      {t.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">📍 {t.location}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-orange-400">৳{t.hourlyFee}/h</div>
                    {t.distanceKm !== undefined && (
                      <div className="text-[10px] text-sky-400 font-medium">{formatDistance(t.distanceKm)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Map Controls Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-white/90 p-2 shadow-lg backdrop-blur border border-slate-200">
        <button
          onClick={onUseMyLocation}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 shadow-sm"
        >
          <MapPinIcon className="h-4 w-4" /> Use My Location
        </button>

        <button
          onClick={toggleMapStyle}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {mapType === "roadmap" ? "🛰️ Satellite" : "🗺️ Standard Map"}
        </button>

        <div className="flex items-center gap-1 px-2 text-xs font-bold text-slate-600 border-l border-slate-200">
          <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
          <span>{tutors.length} Tutors</span>
        </div>
      </div>

      {/* Floating Tutor Detail Quick Card (Bottom Right) */}
      {activeTutor && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-10 max-w-sm rounded-2xl bg-white p-4 shadow-xl border border-slate-200/90 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {activeTutor.image ? (
                <img
                  src={activeTutor.image}
                  alt={activeTutor.name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-100"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-bold text-white ring-2 ring-brand-100">
                  {activeTutor.name[0]}
                </div>
              )}
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                  {activeTutor.name}
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Verified
                  </span>
                </h4>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPinIcon className="h-3 w-3 text-slate-400" />
                  {activeTutor.location}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTutor(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
            <div className="flex items-center gap-1 font-semibold text-amber-600">
              <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {activeTutor.rating} ({activeTutor.reviewCount} reviews)
            </div>
            <div className="font-bold text-brand-700">
              ৳{activeTutor.hourlyFee}<span className="font-normal text-slate-500">/hr</span>
            </div>
            {activeTutor.distanceKm !== undefined && (
              <div className="font-semibold text-sky-600">
                📍 {formatDistance(activeTutor.distanceKm)}
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-slate-600 line-clamp-1">
            <span className="font-medium text-slate-700">Subjects:</span>{" "}
            {activeTutor.subjects.join(", ")}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/dashboard/tutors/${activeTutor.id}`}
              className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              View Profile & Book
            </Link>
            {onOpenChat && (
              <button
                onClick={() => onOpenChat(activeTutor.userId)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 hover:text-brand-600"
                title="Chat with Tutor"
              >
                <ChatIcon className="h-4 w-4" />
              </button>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeTutor.latitude},${activeTutor.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 hover:text-brand-600"
              title="Get Directions on Google Maps"
            >
              <MapPinIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
