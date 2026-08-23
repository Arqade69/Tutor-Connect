// Helper functions for geospatial calculations, district coordinates, and distance calculations

export type LatLng = {
  lat: number;
  lng: number;
};

// Major Districts & Key Locality Default Coordinates in Bangladesh
export const DISTRICT_COORDINATES: Record<string, LatLng> = {
  "Dhaka": { lat: 23.8103, lng: 90.4125 },
  "Dhanmondi": { lat: 23.7461, lng: 90.3742 },
  "Gulshan": { lat: 23.7925, lng: 90.4078 },
  "Uttara": { lat: 23.8759, lng: 90.3795 },
  "Mirpur": { lat: 23.8069, lng: 90.3687 },
  "Banani": { lat: 23.7937, lng: 90.4047 },
  "Bashundhara": { lat: 23.8151, lng: 90.4255 },
  "Mohakhali": { lat: 23.7772, lng: 90.4054 },
  "Lalmatia": { lat: 23.7548, lng: 90.3721 },
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

// Format distance nicely for UI
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm} km away`;
}
