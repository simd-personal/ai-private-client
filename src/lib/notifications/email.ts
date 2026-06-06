import { Resend } from "resend";
import { BUDGET_LABELS, TIMELINE_LABELS } from "@/lib/constants";
import type { AttributionData } from "@/lib/schemas/attribution";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import type { LeadTemperature } from "@/lib/scoring";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";
import {
  getDefaultTenant,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";

export interface LeadEmailPayload {
  leadId: string;
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredContactMethod: string;
  leadScore: number;
  leadTemperature: LeadTemperature;
  quizData: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData;
  internalLeadSummary: string;
  suggestedFollowUpMessage: string;
  leadConcierge?: LeadConcierge | null;
  attribution?: AttributionData;
  tenant?: TenantConfig;
}

function getTimeline(
  data: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): string {
  if (data.leadType === "buyer") {
    return TIMELINE_LABELS[data.timeline] ?? data.timeline;
  }
  if (data.leadType === "equity" || data.leadType === "wealth_forecast") {
    return data.timeline;
  }
  const key = data.sellingTimeline as keyof typeof TIMELINE_LABELS;
  return TIMELINE_LABELS[key] ?? data.sellingTimeline;
}

function getBudgetOrValue(
  data: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): string {
  if (data.leadType === "equity") {
    return data.estimatedCurrentValue != null
      ? `$${data.estimatedCurrentValue.toLocaleString()} (planning est.)`
      : "Planning value TBD";
  }
  if (data.leadType === "wealth_forecast") {
    return `$${data.purchasePrice.toLocaleString()} (purchase)`;
  }
  const range =
    data.leadType === "buyer" ? data.budgetRange : data.estimatedValueRange;
  return BUDGET_LABELS[range] ?? range;
}

function getLocationDetail(
  data: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): string {
  if (data.leadType === "buyer") return data.desiredLocations.join(", ");
  if (data.leadType === "equity") {
    return `${data.currentHomeCity}, ${data.currentHomeState}`;
  }
  if (data.leadType === "wealth_forecast") {
    return data.targetLocations.join(", ");
  }
  const { street, city, state, zip } = data.propertyAddress;
  return `${street}, ${city}, ${state} ${zip}`;
}

function buildEmailHtml(payload: LeadEmailPayload): string {
  const tenant = payload.tenant ?? getDefaultTenant();
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin`;
  const utmLine = payload.attribution?.utm_source
    ? `<p><strong>Source:</strong> ${payload.attribution.utm_source} / ${payload.attribution.utm_medium ?? "—"}</p>`
    : "";
  const conciergeLine = payload.leadConcierge
    ? `<hr />
    <p><strong>Lead Priority</strong></p>
    <p>${payload.leadConcierge.leadPriorityReason}</p>
    <p><strong>Next Best Action</strong></p>
    <p>${payload.leadConcierge.nextBestAction}</p>`
    : "";

  return `
    <h2>New ${payload.leadType} lead — ${payload.leadTemperature.toUpperCase()} (${payload.leadScore}/100)</h2>
    <p><strong>Name:</strong> ${payload.firstName} ${payload.lastName}</p>
    <p><strong>Email:</strong> ${payload.email}</p>
    <p><strong>Phone:</strong> ${payload.phone ?? "Not provided"}</p>
    <p><strong>Preferred contact:</strong> ${payload.preferredContactMethod}</p>
    <p><strong>Timeline:</strong> ${getTimeline(payload.quizData)}</p>
    <p><strong>Budget/Value:</strong> ${getBudgetOrValue(payload.quizData)}</p>
    <p><strong>Location:</strong> ${getLocationDetail(payload.quizData)}</p>
    ${utmLine}
    <hr />
    <p><strong>Internal AI Summary</strong></p>
    <p>${payload.internalLeadSummary}</p>
    <hr />
    <p><strong>Suggested Follow-Up</strong></p>
    <p>${payload.suggestedFollowUpMessage}</p>
    ${conciergeLine}
    <hr />
    <p><a href="${adminUrl}">Open Admin Dashboard</a></p>
    <p><strong>Tenant:</strong> ${tenant.brandName} (${tenant.slug})</p>
  `;
}

export async function sendLeadNotificationEmail(
  payload: LeadEmailPayload
): Promise<void> {
  const tenant = payload.tenant ?? getDefaultTenant();
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = tenant.notificationEmail;

  if (!apiKey || !toEmail) {
    console.warn(
      "[email] RESEND_API_KEY or tenant.notificationEmail not configured — skipping notification"
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: `${tenant.brandName} Lead Alerts <onboarding@resend.dev>`,
      to: toEmail,
      subject: `[${payload.leadTemperature.toUpperCase()}] New ${payload.leadType} lead: ${payload.firstName} ${payload.lastName}`,
      html: buildEmailHtml(payload),
    });
  } catch (error) {
    console.error("[email] Failed to send lead notification:", error);
  }
}
