import { createHash } from "crypto";
import type { AttributionData } from "@/lib/schemas/attribution";
import {
  sanitizeSiteEventMetadata,
  type SiteEventName,
} from "@/lib/schemas/site-analytics";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface InsertSiteEventInput {
  sessionId: string;
  eventName: SiteEventName;
  pagePath?: string | null;
  referrer?: string | null;
  attribution?: AttributionData;
  metadata?: Record<string, string | number | boolean>;
  userAgent?: string | null;
  ipHash?: string | null;
  leadId?: string | null;
  tenantId?: string | null;
}

export interface SiteEventRow {
  id: string;
  created_at: string;
  tenant_id: string | null;
  session_id: string;
  lead_id: string | null;
  event_name: string;
  page_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  metadata: Record<string, unknown>;
  user_agent: string | null;
  ip_hash: string | null;
}

export function hashAnalyticsIp(ip: string): string | null {
  const salt = process.env.ANALYTICS_IP_SALT;
  if (!salt || !ip || ip === "unknown") return null;

  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

function attributionColumns(attribution?: AttributionData) {
  return {
    utm_source: attribution?.utm_source ?? null,
    utm_medium: attribution?.utm_medium ?? null,
    utm_campaign: attribution?.utm_campaign ?? null,
    utm_term: attribution?.utm_term ?? null,
    utm_content: attribution?.utm_content ?? null,
    gclid: attribution?.gclid ?? null,
    fbclid: attribution?.fbclid ?? null,
  };
}

export async function insertSiteEvent(
  input: InsertSiteEventInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const metadata = sanitizeSiteEventMetadata(input.metadata ?? {});

  const { error } = await supabase.from("site_events").insert({
    tenant_id: input.tenantId ?? null,
    session_id: input.sessionId,
    lead_id: input.leadId ?? null,
    event_name: input.eventName,
    page_path: input.pagePath ?? null,
    referrer: input.referrer ?? null,
    ...attributionColumns(input.attribution),
    metadata,
    user_agent: input.userAgent ?? null,
    ip_hash: input.ipHash ?? null,
  });

  if (error) {
    console.error("[site-analytics] insert failed:", error.message);
  }
}

export async function linkSiteEventsToLead(
  sessionId: string | undefined,
  leadId: string,
  tenantId?: string | null
): Promise<void> {
  if (!sessionId?.trim()) return;

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const query = supabase
    .from("site_events")
    .update({ lead_id: leadId })
    .eq("session_id", sessionId)
    .gte("created_at", since)
    .is("lead_id", null);

  if (tenantId) {
    query.eq("tenant_id", tenantId);
  } else {
    query.is("tenant_id", null);
  }

  const { error } = await query;

  if (error) {
    console.error("[site-analytics] link failed:", error.message);
  }
}

export async function recordLeadCreatedSiteEvent(input: {
  leadId: string;
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
  sessionId?: string;
  pagePath?: string;
  attribution?: AttributionData;
  userAgent?: string | null;
  ipHash?: string | null;
  tenantId?: string | null;
}): Promise<void> {
  if (!input.sessionId?.trim()) return;

  await insertSiteEvent({
    sessionId: input.sessionId,
    eventName: "lead_created",
    pagePath: input.pagePath,
    attribution: input.attribution,
    metadata: { lead_type: input.leadType },
    userAgent: input.userAgent,
    ipHash: input.ipHash,
    leadId: input.leadId,
    tenantId: input.tenantId,
  });
}

export interface AdminAnalyticsSummary {
  sessionsLast7Days: number;
  pageViewsLast7Days: number;
  toolStartsLast7Days: number;
  leadSubmissionsLast7Days: number;
  topLandingPages: Array<{ pagePath: string; count: number }>;
  topCtaClicks: Array<{ destinationTool: string; count: number }>;
  topToolStarts: Array<{ leadType: string; count: number }>;
  conversionByTool: Array<{
    leadType: string;
    quizStarts: number;
    leadsCreated: number;
    conversionRate: number;
  }>;
}

export interface LeadSessionJourney {
  landingPage: string | null;
  firstEventAt: string | null;
  pagesViewed: string[];
  ctaClicked: boolean;
  quizStarted: boolean;
  quizSubmitted: boolean;
  resultViewed: boolean;
  bookingClicked: boolean;
  events: SiteEventRow[];
}

export async function getAdminAnalyticsSummary(
  tenantId?: string | null
): Promise<AdminAnalyticsSummary> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const query = supabase
    .from("site_events")
    .select(
      "session_id, event_name, page_path, metadata, created_at, lead_id, tenant_id"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (tenantId) {
    query.eq("tenant_id", tenantId);
  } else {
    query.is("tenant_id", null);
  }

  const { data: events, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = events ?? [];
  const sessionIds = new Set(rows.map((row) => row.session_id));

  const pageViews = rows.filter((row) => row.event_name === "page_view");
  const quizStarts = rows.filter((row) => row.event_name === "quiz_started");
  const leadCreated = rows.filter((row) => row.event_name === "lead_created");
  const ctaClicks = rows.filter(
    (row) =>
      row.event_name === "seo_tool_cta_clicked" ||
      row.event_name === "tool_card_clicked"
  );

  const landingPageCounts = new Map<string, number>();
  for (const sessionId of sessionIds) {
    const sessionEvents = rows
      .filter((row) => row.session_id === sessionId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    const firstPageView = sessionEvents.find(
      (row) => row.event_name === "page_view" && row.page_path
    );
    if (firstPageView?.page_path) {
      landingPageCounts.set(
        firstPageView.page_path,
        (landingPageCounts.get(firstPageView.page_path) ?? 0) + 1
      );
    }
  }

  const ctaCounts = new Map<string, number>();
  for (const row of ctaClicks) {
    const metadata = row.metadata as Record<string, unknown> | null;
    const destination =
      (typeof metadata?.destination_tool === "string"
        ? metadata.destination_tool
        : null) ?? "unknown";
    ctaCounts.set(destination, (ctaCounts.get(destination) ?? 0) + 1);
  }

  const toolStartCounts = new Map<string, number>();
  for (const row of quizStarts) {
    const metadata = row.metadata as Record<string, unknown> | null;
    const leadType =
      (typeof metadata?.lead_type === "string" ? metadata.lead_type : null) ??
      "unknown";
    toolStartCounts.set(leadType, (toolStartCounts.get(leadType) ?? 0) + 1);
  }

  const leadsByTool = new Map<string, number>();
  for (const row of leadCreated) {
    const metadata = row.metadata as Record<string, unknown> | null;
    const leadType =
      (typeof metadata?.lead_type === "string" ? metadata.lead_type : null) ??
      "unknown";
    leadsByTool.set(leadType, (leadsByTool.get(leadType) ?? 0) + 1);
  }

  const allLeadTypes = new Set([
    ...toolStartCounts.keys(),
    ...leadsByTool.keys(),
  ]);

  return {
    sessionsLast7Days: sessionIds.size,
    pageViewsLast7Days: pageViews.length,
    toolStartsLast7Days: quizStarts.length,
    leadSubmissionsLast7Days: leadCreated.length,
    topLandingPages: [...landingPageCounts.entries()]
      .map(([pagePath, count]) => ({ pagePath, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topCtaClicks: [...ctaCounts.entries()]
      .map(([destinationTool, count]) => ({ destinationTool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topToolStarts: [...toolStartCounts.entries()]
      .map(([leadType, count]) => ({ leadType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    conversionByTool: [...allLeadTypes].map((leadType) => {
      const starts = toolStartCounts.get(leadType) ?? 0;
      const leads = leadsByTool.get(leadType) ?? 0;
      return {
        leadType,
        quizStarts: starts,
        leadsCreated: leads,
        conversionRate: starts > 0 ? Math.round((leads / starts) * 100) : 0,
      };
    }),
  };
}

export async function getRecentSiteEvents(
  limit = 50,
  tenantId?: string | null
): Promise<SiteEventRow[]> {
  const supabase = getSupabaseAdmin();

  const query = supabase
    .from("site_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tenantId) {
    query.eq("tenant_id", tenantId);
  } else {
    query.is("tenant_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SiteEventRow[];
}

export async function getLeadSessionJourney(
  leadId: string,
  tenantId?: string | null
): Promise<LeadSessionJourney | null> {
  const supabase = getSupabaseAdmin();

  const query = supabase
    .from("site_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (tenantId) {
    query.eq("tenant_id", tenantId);
  } else {
    query.is("tenant_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const events = (data ?? []) as SiteEventRow[];
  if (events.length === 0) return null;

  const pagesViewed = [
    ...new Set(
      events
        .filter((event) => event.event_name === "page_view" && event.page_path)
        .map((event) => event.page_path as string)
    ),
  ];

  const firstEvent = events[0];

  return {
    landingPage:
      events.find((event) => event.event_name === "page_view")?.page_path ??
      firstEvent.page_path,
    firstEventAt: firstEvent.created_at,
    pagesViewed,
    ctaClicked: events.some(
      (event) =>
        event.event_name === "seo_tool_cta_clicked" ||
        event.event_name === "tool_card_clicked"
    ),
    quizStarted: events.some((event) => event.event_name === "quiz_started"),
    quizSubmitted: events.some(
      (event) => event.event_name === "quiz_submitted"
    ),
    resultViewed: events.some((event) => event.event_name === "result_viewed"),
    bookingClicked: events.some(
      (event) => event.event_name === "booking_clicked"
    ),
    events,
  };
}

export async function getLeadSessionJourneys(
  leadIds: string[],
  tenantId?: string | null
): Promise<Record<string, LeadSessionJourney>> {
  const journeys: Record<string, LeadSessionJourney> = {};

  await Promise.all(
    leadIds.map(async (leadId) => {
      const journey = await getLeadSessionJourney(leadId, tenantId);
      if (journey) {
        journeys[leadId] = journey;
      }
    })
  );

  return journeys;
}
