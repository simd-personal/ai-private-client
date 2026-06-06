import { getAttribution } from "@/lib/attribution";
import * as siteEvents from "@/lib/analytics/site-events";
import {
  clearSeoCtaSession,
  destinationToolFromLeadType,
  getSeoCtaSession,
  isSeoPath,
} from "@/lib/seo/tracking";

type AnalyticsPayload = Record<string, unknown>;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function dispatch(eventName: string, payload?: AnalyticsPayload): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", eventName, payload ?? {});
  }

  if (!isBrowser()) return;

  // TODO: Google Analytics 4 — gtag('event', eventName, payload)
  // TODO: Google Ads conversion — gtag('event', 'conversion', { send_to: '...' })
  // TODO: Meta Pixel — fbq('track', eventName, payload)

  if (typeof window !== "undefined") {
    const w = window as Window & {
      dataLayer?: AnalyticsPayload[];
      gtag?: (...args: unknown[]) => void;
      fbq?: (...args: unknown[]) => void;
    };

    w.dataLayer?.push({ event: eventName, ...payload });

    if (typeof w.gtag === "function") {
      w.gtag("event", eventName, payload);
    }

    if (typeof w.fbq === "function") {
      w.fbq("trackCustom", eventName, payload);
    }
  }
}

/** @deprecated Use specific tracking functions below */
export function trackEvent(name: string, payload?: AnalyticsPayload): void {
  dispatch(name, payload);
}

export function trackPageView(path: string, title?: string): void {
  dispatch("page_view", { path, title });
  siteEvents.trackPageView(path, title);
}

export function trackQuizStarted(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
  payload?: AnalyticsPayload
): void {
  dispatch("quiz_started", { leadType, ...payload });
  siteEvents.trackQuizStarted(leadType);
}

export function trackQuizCompleted(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
  payload?: AnalyticsPayload
): void {
  dispatch("quiz_completed", { leadType, ...payload });
  siteEvents.trackQuizSubmitted({
    lead_type: leadType,
    lead_id:
      typeof payload?.leadId === "string" ? payload.leadId : undefined,
  });
}

export function trackLeadSubmitted(payload: AnalyticsPayload): void {
  dispatch("lead_submitted", payload);
}

export function trackReportViewed(payload: AnalyticsPayload): void {
  dispatch("report_viewed", payload);
  siteEvents.trackResultViewed({
    lead_type:
      typeof payload.leadType === "string" ? payload.leadType : undefined,
    token_present: Boolean(payload.token),
  });
}

export function trackBookingClicked(payload?: AnalyticsPayload): void {
  dispatch("booking_clicked", payload);
  siteEvents.trackBookingClicked({
    location:
      typeof payload?.location === "string" ? payload.location : "unknown",
  });
}

export function trackStrategyRoomViewed(
  metadata?: AnalyticsPayload
): void {
  dispatch("strategy_room_viewed", metadata);
  void siteEvents.trackSiteEvent("strategy_room_viewed", sanitizeMeta(metadata));
}

export function trackScenarioComparisonViewed(
  metadata?: AnalyticsPayload
): void {
  dispatch("scenario_comparison_viewed", metadata);
  void siteEvents.trackSiteEvent(
    "scenario_comparison_viewed",
    sanitizeMeta(metadata)
  );
}

export function trackAdvisorMapViewed(metadata?: AnalyticsPayload): void {
  dispatch("advisor_map_viewed", metadata);
  void siteEvents.trackSiteEvent("advisor_map_viewed", sanitizeMeta(metadata));
}

export function trackPresentationOpened(
  metadata?: AnalyticsPayload
): void {
  dispatch("presentation_opened", metadata);
  void siteEvents.trackSiteEvent("presentation_opened", sanitizeMeta(metadata));
}

export function trackAdvisorBriefGenerated(
  metadata?: AnalyticsPayload
): void {
  dispatch("advisor_brief_generated", metadata);
  void siteEvents.trackSiteEvent(
    "advisor_brief_generated",
    sanitizeMeta(metadata)
  );
}

export function trackFollowupCopied(metadata?: AnalyticsPayload): void {
  dispatch("followup_copied", metadata);
  void siteEvents.trackSiteEvent("followup_copied", sanitizeMeta(metadata));
}

export function trackMeetingPrepViewed(metadata?: AnalyticsPayload): void {
  dispatch("meeting_prep_viewed", metadata);
  void siteEvents.trackSiteEvent("meeting_prep_viewed", sanitizeMeta(metadata));
}

export function trackDecisionGraphViewed(metadata?: AnalyticsPayload): void {
  dispatch("decision_graph_viewed", metadata);
  void siteEvents.trackSiteEvent("decision_graph_viewed", sanitizeMeta(metadata));
}

export function trackDataRoomViewed(metadata?: AnalyticsPayload): void {
  dispatch("data_room_viewed", metadata);
  void siteEvents.trackSiteEvent("data_room_viewed", sanitizeMeta(metadata));
}

export function trackDataRoomItemUpdated(metadata?: AnalyticsPayload): void {
  dispatch("data_room_item_updated", metadata);
  void siteEvents.trackSiteEvent("data_room_item_updated", sanitizeMeta(metadata));
}

export function trackGuardrailsViewed(metadata?: AnalyticsPayload): void {
  dispatch("guardrails_viewed", metadata);
  void siteEvents.trackSiteEvent("guardrails_viewed", sanitizeMeta(metadata));
}

export function trackGuardrailsRechecked(metadata?: AnalyticsPayload): void {
  dispatch("guardrails_rechecked", metadata);
  void siteEvents.trackSiteEvent("guardrails_rechecked", sanitizeMeta(metadata));
}

export function trackDecisionTimelineViewed(metadata?: AnalyticsPayload): void {
  dispatch("decision_timeline_viewed", metadata);
  void siteEvents.trackSiteEvent("decision_timeline_viewed", sanitizeMeta(metadata));
}

export function trackMeetingCopilotViewed(metadata?: AnalyticsPayload): void {
  dispatch("meeting_copilot_viewed", metadata);
  void siteEvents.trackSiteEvent("meeting_copilot_viewed", sanitizeMeta(metadata));
}

export function trackMeetingNoteAdded(metadata?: AnalyticsPayload): void {
  dispatch("meeting_note_added", metadata);
  void siteEvents.trackSiteEvent("meeting_note_added", sanitizeMeta(metadata));
}

export function trackMeetingSummaryGenerated(metadata?: AnalyticsPayload): void {
  dispatch("meeting_summary_generated", metadata);
  void siteEvents.trackSiteEvent("meeting_summary_generated", sanitizeMeta(metadata));
}

function sanitizeMeta(
  metadata?: AnalyticsPayload
): Record<string, string | number | boolean> | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

export function trackSeoToolCtaClicked(payload: {
  source_page: string;
  destination_tool: string;
  cta_label: string;
}): void {
  dispatch("seo_tool_cta_clicked", payload);
  siteEvents.trackSeoCtaClicked(payload);
}

export function trackToolCardClicked(payload: {
  source_page: string;
  destination_tool: string;
  cta_label: string;
}): void {
  dispatch("tool_card_clicked", payload);
  siteEvents.trackToolCardClicked(payload);
}

export function trackSeoQuizStarted(payload: {
  source_page: string;
  destination_tool: string;
  lead_type: string;
}): void {
  dispatch("seo_quiz_started", payload);
}

export function maybeTrackSeoQuizStarted(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast"
): void {
  if (!isBrowser()) return;

  const session = getSeoCtaSession();
  const attribution = getAttribution();
  const sourcePage = session?.source_page ?? attribution?.landing_page;

  if (!session && !isSeoPath(attribution?.landing_page)) {
    return;
  }

  trackSeoQuizStarted({
    source_page: sourcePage ?? "unknown",
    destination_tool:
      session?.destination_tool ?? destinationToolFromLeadType(leadType),
    lead_type: leadType,
  });
  clearSeoCtaSession();
}

export { getOrCreateSessionId } from "@/lib/analytics/site-events";
