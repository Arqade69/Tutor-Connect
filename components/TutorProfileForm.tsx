"use client";

import { useEffect, useRef, useState } from "react";
import type { TutorProfile } from "@prisma/client";
import { updateTutorProfile, toggleProfileVisibility } from "@/actions/tutor";
import { SUBJECTS, CLASS_LEVELS, TEACHING_MEDIUMS, DISTRICTS } from "@/lib/constants";
import { DISTRICT_COORDINATES } from "@/lib/location";
import { Feedback, SubmitButton, useActionForm, asFormAction } from "@/components/form";

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAm75ncyIg7WBVHulhoanm6DY44ixfQ2CA";

function ChipCheckbox({
  name,
  value,
  defaultChecked,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="badge border border-slate-300 bg-white text-slate-600 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700">
        {value}
      </span>
    </label>
  );
}

interface UserLocationProps {
  district?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

function LocationPickerMap({
  lat,
  lng,
  onChangeLocation,
}: {
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

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

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 14,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        draggable: true,
        title: "Drag pin or click map to set location",
      });

      marker.addListener("dragend", (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        onChangeLocation(newLat, newLng);
      });

      map.addListener("click", (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        marker.setPosition({ lat: newLat, lng: newLng });
        onChangeLocation(newLat, newLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      markerRef.current?.setPosition({ lat, lng });
      mapInstanceRef.current?.panTo({ lat, lng });
    }
  }, [mapLoaded, lat, lng, onChangeLocation]);

  if (mapError) {
    return (
      <div className="h-44 w-full rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-500">
        <span>📍 Interactive map preview unavailable</span>
        <span className="mt-1 text-[11px] text-slate-400">Location is pinned automatically based on your selected District & Area Description.</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-300 shadow-inner">
      {!mapLoaded && (
        <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 animate-pulse">
          Loading Interactive Map Pinpointer...
        </div>
      )}
      <div
        ref={mapRef}
        className={`h-48 w-full ${!mapLoaded ? "hidden" : "block"}`}
      />
    </div>
  );
}

export function TutorProfileForm({
  profile,
  user,
}: {
  profile: TutorProfile | null;
  user?: UserLocationProps | null;
}) {
  const [state, formAction, pending] = useActionForm(updateTutorProfile);

  const initialDistrict = user?.district || "Dhaka";
  const initialLat = user?.latitude ?? (DISTRICT_COORDINATES[initialDistrict]?.lat || 23.8103);
  const initialLng = user?.longitude ?? (DISTRICT_COORDINATES[initialDistrict]?.lng || 90.4125);

  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [address, setAddress] = useState(user?.location ?? "");
  const [latitude, setLatitude] = useState<string>(initialLat ? String(initialLat) : "23.8103");
  const [longitude, setLongitude] = useState<string>(initialLng ? String(initialLng) : "90.4125");

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    if (DISTRICT_COORDINATES[newDistrict]) {
      setLatitude(String(DISTRICT_COORDINATES[newDistrict].lat));
      setLongitude(String(DISTRICT_COORDINATES[newDistrict].lng));
    }
  };

  const handleUseMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatitude(lat.toFixed(6));
          setLongitude(lng.toFixed(6));
        },
        () => {
          alert("Could not access your GPS location. Please enable location permissions.");
        }
      );
    }
  };

  const locationOptions = Array.from(
    new Set([...Object.keys(DISTRICT_COORDINATES), ...DISTRICTS])
  ).sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Public Profile & Map Discovery</h3>
          <p className="text-sm text-slate-500">
            This is what students and parents see when searching for tutors near them.
          </p>
        </div>
        {profile && (
          <form action={asFormAction(toggleProfileVisibility)}>
            <button
              type="submit"
              className={`badge shrink-0 ${
                profile.isPublic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {profile.isPublic ? "Visible to students" : "Hidden from students"}
            </button>
          </form>
        )}
      </div>

      {profile?.verificationStatus === "pending" && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Pending admin verification — you can still set up your profile now, it'll go live once approved.
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <div>
          <label className="label" htmlFor="tp-tagline">Professional tagline</label>
          <input
            id="tp-tagline"
            name="tagline"
            className="input"
            defaultValue={profile?.tagline ?? ""}
            placeholder="e.g. Senior Physics Educator | 10+ Years Experience"
          />
        </div>

        <div>
          <label className="label" htmlFor="tp-bio">Bio / About me</label>
          <textarea
            id="tp-bio"
            name="bio"
            rows={3}
            className="input"
            defaultValue={profile?.bio ?? ""}
            placeholder="Tell students about your teaching style and experience"
          />
        </div>

        {/* Location & Google Maps Pinpointing Section */}
        <div className="rounded-xl border border-brand-200 bg-slate-50/80 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <span>📍</span> Tutor Location & Map Pinpoint
              </h4>
              <p className="text-xs text-slate-500">
                Choose your district and click or drag the pin on the map to set your teaching location.
              </p>
            </div>
            <span className="badge bg-brand-50 text-brand-700 border border-brand-200 text-xs">
              Map Pin Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tp-district">District / Locality</label>
              <select
                id="tp-district"
                name="district"
                className="input bg-white"
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="tp-location">Specific Address / Area Description</label>
              <input
                id="tp-location"
                name="location"
                className="input bg-white"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House 14, Road 27, Dhanmondi, Dhaka"
              />
            </div>
          </div>

          {/* Hidden inputs to pass coordinates silently without raw textboxes */}
          <input type="hidden" name="latitude" value={latitude} />
          <input type="hidden" name="longitude" value={longitude} />

          {/* Interactive Google Maps Pinpointer */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>🗺️</span> Click or Drag Pin on Map to Set Location
              </span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1"
              >
                <span>🎯</span> Use My GPS Location
              </button>
            </div>

            <LocationPickerMap
              lat={Number(latitude) || 23.8103}
              lng={Number(longitude) || 90.4125}
              onChangeLocation={(newLat, newLng) => {
                setLatitude(newLat.toFixed(6));
                setLongitude(newLng.toFixed(6));
              }}
            />

            <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="truncate">
                📍 <strong>Selected Area:</strong> {selectedDistrict} {address ? `— ${address}` : ""}
              </span>
              <span className="shrink-0 text-emerald-600 font-medium ml-2">
                ✓ Pin Active
              </span>
            </div>
          </div>
        </div>

        <div>
          <span className="label">Subjects you teach</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <ChipCheckbox
                key={s}
                name="subjects"
                value={s}
                defaultChecked={profile?.subjects.includes(s) ?? false}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="label">Class levels</span>
          <div className="flex flex-wrap gap-2">
            {CLASS_LEVELS.map((c) => (
              <ChipCheckbox
                key={c}
                name="classLevels"
                value={c}
                defaultChecked={profile?.classLevels.includes(c) ?? false}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tp-medium">Medium of instruction</label>
            <select
              id="tp-medium"
              name="medium"
              className="input"
              defaultValue={profile?.medium ?? "Bangla"}
            >
              {TEACHING_MEDIUMS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tp-fee">Hourly fee (BDT)</label>
            <input
              id="tp-fee"
              name="hourlyFee"
              type="number"
              min={0}
              className="input"
              defaultValue={profile?.hourlyFee ?? ""}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton pending={pending}>{profile ? "Save changes" : "Create profile"}</SubmitButton>
          <Feedback state={state} />
        </div>
      </form>
    </div>
  );
}
