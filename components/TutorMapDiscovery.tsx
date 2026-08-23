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

    // Render User Location Marker
    if (userLocation) {
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);

      const userMarkerContent = document.createElement("div");
      userMarkerContent.className = "relative flex items-center justify-center";
      userMarkerContent.innerHTML = `
        <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-lg"></span>
      `;

      if (window.google.maps.Marker) {
        userMarkerRef.current = new window.google.maps.Marker({
          position: userLocation,
          map: map,
          title: "Your Location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      }

      // Draw search radius circle
      if (radiusCircleRef.current) radiusCircleRef.current.setMap(null);

      radiusCircleRef.current = new window.google.maps.Circle({
        strokeColor: "#2563eb",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        map: map,
        center: userLocation,
        radius: searchRadiusKm * 1000, // meters
      });
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

      {/* Fallback / Loading Overlay */}
      {(!mapLoaded || mapError) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center backdrop-blur-sm text-white">
          <div className="max-w-md space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg ring-4 ring-brand-400/20">
              <MapPinIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">Interactive Tutor Map</h3>
            <p className="text-sm text-slate-300">
              {mapError
                ? "Showing localized tutor map preview with interactive pin cards."
                : "Loading Google Maps API..."}
            </p>

            {/* Interactive Fallback Map Grid */}
            <div className="mt-4 rounded-xl bg-slate-800/80 p-4 border border-slate-700 text-left space-y-3 max-h-[340px] overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-semibold text-brand-300 uppercase tracking-wider">
                <span>Verified Tutors Near You</span>
                <span>{tutors.length} Locations</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {tutors.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setActiveTutor(t);
                      if (onSelectTutor) onSelectTutor(t);
                    }}
                    className={`cursor-pointer rounded-lg p-3 transition border ${
                      activeTutor?.id === t.id
                        ? "border-brand-500 bg-brand-950/40 ring-1 ring-brand-500"
                        : "border-slate-700 bg-slate-900/60 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {t.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{t.name}</div>
                          <div className="text-xs text-slate-400">📍 {t.location}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-brand-400">৳{t.hourlyFee}/hr</div>
                        <div className="text-[10px] text-amber-400">★ {t.rating}</div>
                      </div>
                    </div>
                    {t.distanceKm !== undefined && (
                      <div className="mt-1.5 text-[11px] text-sky-400 font-medium">
                        🚗 {formatDistance(t.distanceKm)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
