// Helper functions for geospatial calculations, district coordinates, and distance calculations

export type LatLng = {
  lat: number;
  lng: number;
};

// Major Districts & Key Locality Default Coordinates in Bangladesh
export const DISTRICT_COORDINATES: Record<string, LatLng> = {
  "Dhaka": { lat: 23.8103, lng: 90.4125 },
  "Shantinagar": { lat: 23.7386, lng: 90.4128 },
  "Dhanmondi": { lat: 23.7461, lng: 90.3742 },
  "Gulshan": { lat: 23.7925, lng: 90.4078 },
  "Uttara": { lat: 23.8759, lng: 90.3795 },
  "Mirpur": { lat: 23.8069, lng: 90.3687 },
  "Banani": { lat: 23.7937, lng: 90.4047 },
  "Bashundhara": { lat: 23.8151, lng: 90.4255 },
  "Mohakhali": { lat: 23.7772, lng: 90.4054 },
  "Lalmatia": { lat: 23.7548, lng: 90.3721 },
  "Mohammadpur": { lat: 23.7658, lng: 90.3584 },
  "Malibagh": { lat: 23.7483, lng: 90.4144 },
  "Moghbazar": { lat: 23.7494, lng: 90.4037 },
  "Kakrail": { lat: 23.7371, lng: 90.4072 },
  "Baily Road": { lat: 23.7420, lng: 90.4082 },
  "Motijheel": { lat: 23.7330, lng: 90.4170 },
  "Khilgaon": { lat: 23.7533, lng: 90.4261 },
  "Rampura": { lat: 23.7612, lng: 90.4217 },
  "Badda": { lat: 23.7805, lng: 90.4267 },
  "Banasree": { lat: 23.7634, lng: 90.4350 },
  "Farmgate": { lat: 23.7561, lng: 90.3872 },
  "Tejgaon": { lat: 23.7600, lng: 90.3950 },
  "Kawran Bazar": { lat: 23.7516, lng: 90.3943 },
  "Agargaon": { lat: 23.7770, lng: 90.3780 },
  "Shewrapara": { lat: 23.7885, lng: 90.3715 },
  "Kazipara": { lat: 23.7950, lng: 90.3698 },
  "Shahbagh": { lat: 23.7388, lng: 90.3958 },
  "Azimpur": { lat: 23.7290, lng: 90.3853 },
  "Old Dhaka": { lat: 23.7104, lng: 90.4074 },
  "Chattogram": { lat: 22.3569, lng: 91.7832 },
  "Panchlaish": { lat: 22.3592, lng: 91.8215 },
  "Nasirabad": { lat: 22.3685, lng: 91.8122 },
  "Sylhet": { lat: 24.8949, lng: 91.8687 },
  "Zindabazar": { lat: 24.8949, lng: 91.8687 },
  "Rajshahi": { lat: 24.3636, lng: 88.6282 },
  "Khulna": { lat: 22.8157, lng: 89.5519 },
  "Barishal": { lat: 22.7010, lng: 90.3535 },
  "Rangpur": { lat: 25.7439, lng: 89.2752 },
  "Mymensingh": { lat: 24.7471, lng: 90.4203 },
  "Cumilla": { lat: 23.4607, lng: 91.1809 },
  "Gazipur": { lat: 23.9999, lng: 90.4203 },
  "Gaziupur": { lat: 23.9999, lng: 90.4203 },
  "Narayanganj": { lat: 23.6238, lng: 90.5000 },
};

// Calculate distance between two lat/lng coordinates in kilometers using Haversine Formula
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return Number(distance.toFixed(1));
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get fallback coordinates for location string if exact lat/lng is missing
export function getCoordinatesForLocation(locationStr?: string, districtStr?: string): LatLng {
  const text = `${locationStr || ""} ${districtStr || ""}`.toLowerCase();

  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (text.includes(key.toLowerCase())) {
      // Add slight micro jitter so overlapping tutors in same sub-area don't completely hide each other
      const jitterLat = (Math.random() - 0.5) * 0.006;
      const jitterLng = (Math.random() - 0.5) * 0.006;
      return {
        lat: Number((coords.lat + jitterLat).toFixed(6)),
        lng: Number((coords.lng + jitterLng).toFixed(6)),
      };
    }
  }

  // Default to Dhaka center
  return DISTRICT_COORDINATES["Dhaka"];
}

// Geocode address using Google Maps JS Geocoder if available, or fallback to preset matching
export async function geocodeAddress(query: string): Promise<{ coords: LatLng; label: string } | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  // Try Google Maps Geocoder if loaded on client
  if (typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const searchTarget = cleanQuery.toLowerCase().includes("bangladesh") || cleanQuery.toLowerCase().includes("dhaka")
        ? cleanQuery
        : `${cleanQuery}, Dhaka, Bangladesh`;

      const response = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ address: searchTarget }, (results: any[], status: string) => {
          if (status === "OK" && results && results[0]) {
            resolve(results[0]);
          } else {
            reject(status);
          }
        });
      });

      if (response && response.geometry && response.geometry.location) {
        const lat = Number(response.geometry.location.lat().toFixed(6));
        const lng = Number(response.geometry.location.lng().toFixed(6));
        const label = response.formatted_address || cleanQuery;
        return { coords: { lat, lng }, label };
      }
    } catch (e) {
      console.warn("Google Maps Geocoding fallback to local lookup:", e);
    }
  }

  // Local Preset Dictionary Fallback
  const qLower = cleanQuery.toLowerCase();
  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (qLower.includes(key.toLowerCase()) || key.toLowerCase().includes(qLower)) {
      return { coords, label: key };
    }
  }

  return null;
}

// Format distance nicely for UI
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm} km away`;
}

