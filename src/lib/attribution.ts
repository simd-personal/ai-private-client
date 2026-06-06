import type { AttributionData } from "@/lib/schemas/attribution";

const STORAGE_KEY = "astoria_attribution";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function captureAttribution(): void {
  if (!isBrowser()) return;

  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const data: AttributionData = {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    utm_term: params.get("utm_term") ?? undefined,
    utm_content: params.get("utm_content") ?? undefined,
    gclid: params.get("gclid") ?? undefined,
    fbclid: params.get("fbclid") ?? undefined,
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeAttribution(data)));
  } catch {
    /* storage unavailable */
  }
}

function sanitizeAttribution(data: AttributionData): AttributionData {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value != null && value !== "")
  ) as AttributionData;
}

export function getAttribution(): AttributionData | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionData;
    return sanitizeAttribution(parsed);
  } catch {
    return null;
  }
}
