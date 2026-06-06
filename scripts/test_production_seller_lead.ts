/**
 * Seed one realistic production seller test lead via the live public API.
 *
 * Usage:
 *   PRODUCTION_SITE_URL=https://your-domain.com \
 *   PRODUCTION_TEST_SEED_CONFIRM=true \
 *   npm run test:prod-seller
 *
 * Notifications are suppressed by default. Set SUPPRESS_TEST_NOTIFICATIONS=false
 * only when intentionally testing email delivery.
 */

import { config } from "dotenv";
import type { LeadApiRequest } from "../src/lib/schemas/lead-api";

config({ path: ".env.local" });

interface LeadApiSuccessResponse {
  leadId: string;
  token: string;
  leadType: string;
}

/** Default on: only SUPPRESS_TEST_NOTIFICATIONS=false enables real notifications. */
function isNotificationSuppressionEnabled(): boolean {
  return process.env.SUPPRESS_TEST_NOTIFICATIONS !== "false";
}

interface SeedResult {
  httpStatus: number;
  leadId: string | null;
  token: string | null;
  resultUrl: string | null;
  saveSucceeded: boolean;
  notificationSuppressed: boolean;
  error: string | null;
}

function getProductionTestTenantSlug(): string | null {
  const raw = process.env.PRODUCTION_TEST_TENANT?.trim().toLowerCase();
  if (!raw) return null;
  return raw.replace(/[^a-z0-9-]/g, "");
}

function buildTenantAdminUrl(siteUrl: string, tenantSlug: string | null): string {
  return tenantSlug ? `${siteUrl}/a/${tenantSlug}/admin` : `${siteUrl}/admin`;
}

function buildTenantResultUrl(
  siteUrl: string,
  token: string,
  tenantSlug: string | null
): string {
  return tenantSlug
    ? `${siteUrl}/a/${tenantSlug}/result?token=${encodeURIComponent(token)}`
    : `${siteUrl}/result?token=${encodeURIComponent(token)}`;
}

function requireProductionSeedConfirm(): void {
  if (process.env.PRODUCTION_TEST_SEED_CONFIRM !== "true") {
    console.error(`
Refusing to create a production seller test lead.

Set PRODUCTION_TEST_SEED_CONFIRM=true to confirm you intend to write a test lead
to the production database via the live API.
`);
    process.exit(1);
  }
}

function requireProductionSiteUrl(): string {
  const url = process.env.PRODUCTION_SITE_URL?.trim();
  if (!url) {
    console.error(`
PRODUCTION_SITE_URL is required.

Example:
  PRODUCTION_SITE_URL=https://your-domain.com \\
  PRODUCTION_TEST_SEED_CONFIRM=true \\
  npm run test:prod-seller
`);
    process.exit(1);
  }

  return url.replace(/\/$/, "");
}

function buildProductionSellerPayload(siteUrl: string): LeadApiRequest {
  const email =
    process.env.PRODUCTION_TEST_EMAIL?.trim() ||
    "test+seller-production@example.com";
  const phone = process.env.PRODUCTION_TEST_PHONE?.trim() || "5555555555";
  const suppressNotifications = isNotificationSuppressionEnabled();
  const testSeededAt = new Date().toISOString();
  const sessionId = `prod-seller-${Date.now().toString(36)}`;

  return {
    leadType: "seller",
    propertyAddress: {
      street: "218 E Oceanfront",
      city: "Newport Beach",
      state: "CA",
      zip: "92661",
    },
    estimatedValueRange: "5000000 to 10000000",
    propertyCondition: "luxury renovated",
    sellingTimeline: "3 to 6 months",
    sellerPriority: "privacy",
    propertyType: "single family",
    bedrooms: 5,
    bathrooms: 6,
    squareFeet: 5200,
    lotSize: 3500,
    yearBuilt: 2024,
    hoaStatus: "no",
    poolStatus: "unknown",
    garageSpaces: 2,
    notableFeatures:
      "Oceanfront position, newer construction, private outdoor areas, upgraded finishes, garage parking, coastal orientation.",
    recentUpgrades:
      "Recent construction and luxury finish package. the advisory team should verify permits, systems, appliances, warranties, and final specifications.",
    upgrades:
      "Recent construction and luxury finish package. the advisory team should verify permits, systems, appliances, warranties, and final specifications.",
    buyerObjectionConcerns:
      "Seller wants privacy, limited exposure, qualified showings, and a confidential strategy before any broad public launch.",
    viewType: "ocean or coastline",
    waterProximity: "direct oceanfront",
    gatedOrPrivateAccess: "unknown",
    poolSpa: "unknown",
    guestHouse: "unknown",
    elevator: "unknown",
    outdoorKitchen: "unknown",
    wineRoom: "unknown",
    theater: "unknown",
    gym: "unknown",
    smartHome: "unknown",
    architectDesigner: "unknown_confirm_with_advisor",
    photoPrivacyPreference: "limited_distribution",
    showingPrivacyPreference: "qualified_private_showings",
    priorListingHistory: "unknown_confirm_with_advisor",
    freeText:
      "Production test lead. Seller wants a privacy first strategy for an oceanfront Newport Beach property and wants to understand whether a broker to broker preview or private showing protocol makes sense before any broader launch.",
    contact: {
      firstName: "Test",
      lastName: "Production Seller",
      email,
      phone,
      preferredContactMethod: "email",
      consentGiven: true,
    },
    honeypot: "",
    attribution: {
      landing_page: `${siteUrl}/seller`,
      referrer: "production_test_script",
      utm_source: "production_test",
      utm_medium: "script",
      utm_campaign: "seller_enrichment_test",
    },
    sessionId,
    testMetadata: {
      isTestLead: true,
      testSeededAt,
      testSource: "production_seller_lead_script",
      suppressNotifications,
    },
  };
}

async function postSellerLead(
  siteUrl: string,
  payload: LeadApiRequest,
  suppressNotifications: boolean
): Promise<SeedResult> {
  const tenantSlug = getProductionTestTenantSlug();
  const endpoint = tenantSlug
    ? `${siteUrl}/api/leads?tenant=${encodeURIComponent(tenantSlug)}`
    : `${siteUrl}/api/leads`;
  const suppressHeader = String(suppressNotifications);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "private-client-production-seller-test-script/1.0",
        "X-Test-Lead": "true",
        "X-Suppress-Notifications": suppressHeader,
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as
      | LeadApiSuccessResponse
      | { error?: string; details?: unknown };

    if (!response.ok) {
      const detail =
        "details" in body && body.details
          ? ` ${JSON.stringify(body.details)}`
          : "";
      return {
        httpStatus: response.status,
        leadId: null,
        token: null,
        resultUrl: null,
        saveSucceeded: false,
        notificationSuppressed: suppressNotifications,
        error:
          "error" in body && body.error
            ? `${body.error}${detail}`
            : `Request failed with status ${response.status}`,
      };
    }

    const success = body as LeadApiSuccessResponse;
    const token = success.token ?? null;

    return {
      httpStatus: response.status,
      leadId: success.leadId ?? null,
      token,
      resultUrl: token
        ? buildTenantResultUrl(siteUrl, token, tenantSlug)
        : null,
      saveSucceeded: Boolean(success.leadId && success.token),
      notificationSuppressed: suppressNotifications,
      error: null,
    };
  } catch (error) {
    return {
      httpStatus: 0,
      leadId: null,
      token: null,
      resultUrl: null,
      saveSucceeded: false,
      notificationSuppressed: suppressNotifications,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printVerificationChecklist(adminUrl: string, resultUrl: string | null): void {
  console.log("\n── Verify in production ──");
  console.log(`Admin:        ${adminUrl}`);
  if (resultUrl) {
    console.log(`Public result: ${resultUrl}`);
  }
  console.log(`
Checklist:
  [ ] Lead appears in /admin with last name "Production Seller"
  [ ] Property Intelligence section shows enrichment (RentCast / address context)
  [ ] Lead Concierge block is populated (admin-only)
  [ ] Website Activity shows this session if analytics tracking is active
  [ ] Public result page opens and does NOT show:
        - raw API payloads or vendor field names
        - internalLeadSummary
        - lead score or readiness score
        - Lead Concierge content
  [ ] Seller report address phrasing is natural (not repeated on every bullet)
  [ ] Delete the test lead after verification
`);
}

async function main(): Promise<void> {
  requireProductionSeedConfirm();
  const siteUrl = requireProductionSiteUrl();
  const suppressNotifications = isNotificationSuppressionEnabled();
  const tenantSlug = getProductionTestTenantSlug();
  const payload = buildProductionSellerPayload(siteUrl);

  console.log("Private Client Property Desk — production seller test lead");
  console.log(`Site URL:                 ${siteUrl}`);
  console.log(`Tenant scope:             ${tenantSlug ?? "private-client (default)"}`);
  console.log(`Notifications suppressed: ${suppressNotifications}`);
  console.log(`Contact email:            ${payload.contact.email}`);
  console.log(`Session id:               ${payload.sessionId ?? "n/a"}`);
  console.log(
    `\nPosting seller lead to /api/leads${tenantSlug ? `?tenant=${tenantSlug}` : ""} ...`
  );

  const result = await postSellerLead(siteUrl, payload, suppressNotifications);
  const adminUrl = buildTenantAdminUrl(siteUrl, tenantSlug);

  console.log(`\nHTTP status:              ${result.httpStatus || "network error"}`);
  console.log(`Lead id:                  ${result.leadId ?? "n/a"}`);
  console.log(`Result token:             ${result.token ?? "n/a"}`);
  console.log(`Result URL:               ${result.resultUrl ?? "n/a"}`);
  console.log(`Admin URL:                ${adminUrl}`);
  console.log(`Notifications suppressed: ${result.notificationSuppressed}`);

  if (result.error) {
    console.error(`Error:                    ${result.error}`);
    process.exit(1);
  }

  if (!result.saveSucceeded) {
    console.error("\nLead API did not return leadId and token.");
    process.exit(1);
  }

  printVerificationChecklist(adminUrl, result.resultUrl);
}

main().catch((error) => {
  console.error("Production seller test script failed:", error);
  process.exit(1);
});
