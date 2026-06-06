import {
  assessAddressMatch,
  GENERIC_ADDRESS_VERIFICATION_PROMPT,
} from "@/lib/property/addressNormalization";
import type { EquityGoogleAddressContext } from "@/lib/property/equityPropertyTypes";
import {
  isSafeNearbyPlace,
  SAFE_NEARBY_SEARCH_TYPES,
} from "@/lib/property/nearbyPlaceFilter";
import type { GoogleAddressContext, GoogleNearbyPlace } from "@/lib/property/types";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_NEARBY_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

interface GeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
}

interface PlacesNearbyResponse {
  status: string;
  results?: Array<{
    name?: string;
    types?: string[];
  }>;
}

function buildLocationContext(places: GoogleNearbyPlace[]): string {
  if (places.length === 0) {
    return "General area context is limited; nearby amenities should be confirmed with the seller during advisor review.";
  }

  const categories = [...new Set(places.map((p) => p.category))];
  const sample = places
    .slice(0, 5)
    .map((p) => p.name)
    .join(", ");

  return `Nearby general amenities include ${categories.join(", ")} (examples: ${sample}). Use only for neutral orientation — not schools, safety, demographics, or suitability claims.`;
}

function categoryFromTypes(types: string[]): string {
  const allowed = types.find((t) =>
    SAFE_NEARBY_SEARCH_TYPES.includes(
      t as (typeof SAFE_NEARBY_SEARCH_TYPES)[number]
    )
  );
  return (allowed ?? types[0] ?? "place").replace(/_/g, " ");
}

/**
 * Validates and enriches an address via Google Geocoding + Places Nearby Search.
 * Returns null when GOOGLE_MAPS_API_KEY is unset or the request fails.
 */
export async function getGoogleAddressContext(
  submittedAddress: string
): Promise<GoogleAddressContext | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return null;

  const trimmed = submittedAddress.trim();
  if (!trimmed) return null;

  try {
    const geocodeParams = new URLSearchParams({
      address: trimmed,
      key: apiKey,
    });
    const geocodeRes = await fetch(`${GEOCODE_URL}?${geocodeParams}`, {
      signal: AbortSignal.timeout(12_000),
    });
    const geocode = (await geocodeRes.json()) as GeocodeResponse;

    if (geocode.status !== "OK" || !geocode.results?.[0]) {
      console.warn("[google_maps] Geocode status:", geocode.status);
      return null;
    }

    const top = geocode.results[0];
    const lat = top.geometry?.location?.lat;
    const lng = top.geometry?.location?.lng;
    const normalizedAddress = top.formatted_address?.trim();

    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !normalizedAddress
    ) {
      return null;
    }

    const addressAssessment = assessAddressMatch(trimmed, normalizedAddress);
    const nearbyPlaces: GoogleNearbyPlace[] = [];

    for (const placeType of SAFE_NEARBY_SEARCH_TYPES) {
      const params = new URLSearchParams({
        location: `${lat},${lng}`,
        radius: "2000",
        type: placeType,
        key: apiKey,
      });
      const placesRes = await fetch(`${PLACES_NEARBY_URL}?${params}`, {
        signal: AbortSignal.timeout(10_000),
      });
      const placesData = (await placesRes.json()) as PlacesNearbyResponse;

      if (placesData.status !== "OK" || !placesData.results) continue;

      for (const place of placesData.results) {
        if (!isSafeNearbyPlace(place)) continue;
        if (!place.name?.trim()) continue;
        nearbyPlaces.push({
          name: place.name.trim(),
          category: categoryFromTypes(place.types ?? [placeType]),
        });
      }
    }

    const deduped = nearbyPlaces.filter(
      (place, index, arr) =>
        arr.findIndex((p) => p.name === place.name) === index
    );

    const finalPlaces = deduped.slice(0, 10);
    let locationContext = buildLocationContext(finalPlaces);

    if (addressAssessment.addressDiscrepancy) {
      locationContext = `${GENERIC_ADDRESS_VERIFICATION_PROMPT} ${locationContext}`;
    }

    return {
      normalizedAddress: addressAssessment.normalizedAddress,
      submittedAddress: addressAssessment.submittedAddress,
      addressMatchConfidence: addressAssessment.addressMatchConfidence,
      addressDiscrepancy: addressAssessment.addressDiscrepancy,
      lat,
      lng,
      nearbyPlaces: finalPlaces,
      locationContext,
      dataSource: "google_maps_api",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn("[google_maps] Address context error:", message);
    return null;
  }
}

/** Geocoding-only validation for equity flows (no nearby places). */
export async function getGoogleNormalizedAddress(
  submittedAddress: string
): Promise<EquityGoogleAddressContext | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return null;

  const trimmed = submittedAddress.trim();
  if (!trimmed) return null;

  try {
    const geocodeParams = new URLSearchParams({
      address: trimmed,
      key: apiKey,
    });
    const geocodeRes = await fetch(`${GEOCODE_URL}?${geocodeParams}`, {
      signal: AbortSignal.timeout(12_000),
    });
    const geocode = (await geocodeRes.json()) as GeocodeResponse;

    if (geocode.status !== "OK" || !geocode.results?.[0]) {
      console.warn("[google_maps] Geocode status:", geocode.status);
      return null;
    }

    const normalizedAddress = geocode.results[0].formatted_address?.trim();
    if (!normalizedAddress) return null;

    const assessment = assessAddressMatch(trimmed, normalizedAddress);

    return {
      normalizedAddress: assessment.normalizedAddress,
      submittedAddress: assessment.submittedAddress,
      addressConfidence: assessment.addressMatchConfidence,
      addressDiscrepancy: assessment.addressDiscrepancy,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn("[google_maps] Address validation error:", message);
    return null;
  }
}
