const BLOCKED_TYPE_FRAGMENTS = [
  "school",
  "primary_school",
  "secondary_school",
  "university",
  "church",
  "place_of_worship",
  "hospital",
  "doctor",
  "police",
  "fire_station",
  "courthouse",
  "local_government_office",
] as const;

const ALLOWED_NEARBY_TYPES = new Set([
  "park",
  "restaurant",
  "cafe",
  "supermarket",
  "shopping_mall",
  "store",
  "tourist_attraction",
  "natural_feature",
]);

const BLOCKED_NAME_PATTERN =
  /\b(school|academy|church|temple|synagogue|mosque|hospital|medical|clinic|police|fire\s*station|\bfire\b|courthouse|university|college|preschool|kindergarten)\b/i;

export const SAFE_NEARBY_SEARCH_TYPES = [
  "park",
  "restaurant",
  "cafe",
  "supermarket",
  "shopping_mall",
  "store",
  "tourist_attraction",
  "natural_feature",
] as const;

export function isBlockedPlaceType(type: string): boolean {
  const lower = type.toLowerCase();
  return BLOCKED_TYPE_FRAGMENTS.some(
    (blocked) => lower === blocked || lower.includes(blocked)
  );
}

export function isAllowedPlaceType(type: string): boolean {
  return ALLOWED_NEARBY_TYPES.has(type.toLowerCase());
}

export function isSafeNearbyPlaceName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return !BLOCKED_NAME_PATTERN.test(trimmed);
}

export function isSafeNearbyPlace(place: {
  name?: string;
  types?: string[];
}): boolean {
  const name = place.name?.trim() ?? "";
  if (!isSafeNearbyPlaceName(name)) return false;

  const types = place.types ?? [];
  if (types.length === 0) return false;
  if (types.some((t) => isBlockedPlaceType(t))) return false;

  return types.some((t) => isAllowedPlaceType(t));
}
