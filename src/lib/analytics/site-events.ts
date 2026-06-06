import { getAttribution } from "@/lib/attribution";
import type { SiteEventName } from "@/lib/schemas/site-analytics";
import { getTenantSlugFromPath } from "@/lib/tenants/tenant-paths";

const SESSION_STORAGE_KEY = "astoria_site_session_id";

type SiteEventMetadata = Record<string, string | number | boolean>;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getOrCreateSessionId(): string {
  if (!isBrowser()) return "server";

  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    return sessionId;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export async function trackSiteEvent(
  eventName: SiteEventName,
  metadata?: SiteEventMetadata,
  pagePath?: string
): Promise<void> {
  if (!isBrowser()) return;

  const resolvedPath = pagePath ?? window.location.pathname;
  if (resolvedPath.startsWith("/admin")) return;

  const payload = {
    sessionId: getOrCreateSessionId(),
    eventName,
    tenantSlug: getTenantSlugFromPath(window.location.pathname) ?? undefined,
    pagePath: resolvedPath,
    referrer: document.referrer || undefined,
    attribution: getAttribution() ?? undefined,
    metadata,
  };

  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* analytics should never block UX */
  }
}

export function trackPageView(path: string, title?: string): void {
  void trackSiteEvent("page_view", title ? { title } : undefined, path);
}

export function trackToolCardClicked(payload: {
  destination_tool: string;
  cta_label: string;
  source_page: string;
}): void {
  void trackSiteEvent("tool_card_clicked", payload, payload.source_page);
}

export function trackSeoCtaClicked(payload: {
  source_page: string;
  destination_tool: string;
  cta_label: string;
}): void {
  void trackSiteEvent("seo_tool_cta_clicked", payload, payload.source_page);
}

export function trackQuizStarted(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast"
): void {
  void trackSiteEvent("quiz_started", { lead_type: leadType });
}

export function trackQuizStepViewed(payload: {
  lead_type: "buyer" | "seller" | "equity" | "wealth_forecast";
  step: number;
  total_steps: number;
}): void {
  void trackSiteEvent("quiz_step_viewed", payload);
}

export function trackQuizSubmitted(payload: {
  lead_type: "buyer" | "seller" | "equity" | "wealth_forecast";
  lead_id?: string;
}): void {
  void trackSiteEvent("quiz_submitted", payload);
}

export function trackResultViewed(payload: {
  lead_type?: string;
  token_present: boolean;
}): void {
  void trackSiteEvent("result_viewed", payload);
}

export function trackBookingClicked(payload: { location: string }): void {
  void trackSiteEvent("booking_clicked", payload);
}
