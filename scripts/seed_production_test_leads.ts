/**
 * Seed four labeled test leads in production via the public lead API.
 *
 * Usage:
 *   PRODUCTION_SITE_URL=https://your-domain.com \
 *   PRODUCTION_TEST_SEED_CONFIRM=true \
 *   SUPPRESS_TEST_NOTIFICATIONS=true \
 *   npm run seed:prod-leads
 */

import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import type { LeadApiRequest } from "../src/lib/schemas/lead-api";

config({ path: ".env.local" });

const TEST_LAST_NAMES = [
  "Buyer Lead",
  "Seller Lead",
  "Equity Lead",
  "Wealth Lead",
] as const;

type TestLeadKind = "buyer" | "seller" | "equity" | "wealth_forecast";

interface SeedDefinition {
  kind: TestLeadKind;
  fixture: string;
  lastName: (typeof TEST_LAST_NAMES)[number];
  defaultEmail: string;
}

const SEED_DEFINITIONS: SeedDefinition[] = [
  {
    kind: "buyer",
    fixture: "buyer.irvine.townhome.json",
    lastName: "Buyer Lead",
    defaultEmail: "test+buyer@example.com",
  },
  {
    kind: "seller",
    fixture: "seller.costa.mesa.json",
    lastName: "Seller Lead",
    defaultEmail: "test+seller@example.com",
  },
  {
    kind: "equity",
    fixture: "equity.irvine.owned10.json",
    lastName: "Equity Lead",
    defaultEmail: "test+equity@example.com",
  },
  {
    kind: "wealth_forecast",
    fixture: "wealth.newport.founder.json",
    lastName: "Wealth Lead",
    defaultEmail: "test+wealth@example.com",
  },
];

interface LeadApiSuccessResponse {
  leadId: string;
  token: string;
  leadType: string;
}

interface SeedResult {
  leadType: TestLeadKind;
  httpStatus: number;
  leadId: string | null;
  token: string | null;
  resultUrl: string | null;
  saveSucceeded: boolean;
  notificationSuppressed: boolean;
  error: string | null;
}

function requireProductionSeedConfirm(): void {
  if (process.env.PRODUCTION_TEST_SEED_CONFIRM !== "true") {
    console.error(`
Refusing to seed production test leads.

Set PRODUCTION_TEST_SEED_CONFIRM=true to confirm you intend to write test leads
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
  PRODUCTION_SITE_URL=https://your-domain.com PRODUCTION_TEST_SEED_CONFIRM=true npm run seed:prod-leads
`);
    process.exit(1);
  }

  return url.replace(/\/$/, "");
}

function loadFixturePayload(fixtureFile: string): Record<string, unknown> {
  const path = join(process.cwd(), "scripts", "fixtures", fixtureFile);
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function buildSeedPayload(definition: SeedDefinition): LeadApiRequest {
  const fixture = loadFixturePayload(definition.fixture);
  const sharedEmail = process.env.PRODUCTION_TEST_EMAIL?.trim();
  const sharedPhone = process.env.PRODUCTION_TEST_PHONE?.trim() ?? "5555555555";
  const suppressNotifications =
    process.env.SUPPRESS_TEST_NOTIFICATIONS === "true";

  const contact = {
    firstName: "Test",
    lastName: definition.lastName,
    email: sharedEmail || definition.defaultEmail,
    phone: sharedPhone,
    preferredContactMethod: "email" as const,
    consentGiven: true,
  };

  const { contact: _ignoredContact, ...fixtureWithoutContact } = fixture;
  void _ignoredContact;

  return {
    ...fixtureWithoutContact,
    leadType: definition.kind,
    contact,
    honeypot: "",
    testMetadata: {
      isTestLead: true,
      testSeededAt: new Date().toISOString(),
      testSource: "production_seed_script",
      suppressNotifications,
    },
  } as LeadApiRequest;
}

async function seedLead(
  siteUrl: string,
  payload: LeadApiRequest,
  notificationSuppressed: boolean
): Promise<SeedResult> {
  const leadType = payload.leadType as TestLeadKind;

  try {
    const response = await fetch(`${siteUrl}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "astoria-production-seed-script/1.0",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as
      | LeadApiSuccessResponse
      | { error?: string };

    if (!response.ok) {
      return {
        leadType,
        httpStatus: response.status,
        leadId: null,
        token: null,
        resultUrl: null,
        saveSucceeded: false,
        notificationSuppressed,
        error:
          "error" in body && body.error
            ? body.error
            : `Request failed with status ${response.status}`,
      };
    }

    const success = body as LeadApiSuccessResponse;
    const token = success.token ?? null;

    return {
      leadType,
      httpStatus: response.status,
      leadId: success.leadId ?? null,
      token,
      resultUrl: token ? `${siteUrl}/result?token=${encodeURIComponent(token)}` : null,
      saveSucceeded: Boolean(success.leadId && success.token),
      notificationSuppressed,
      error: null,
    };
  } catch (error) {
    return {
      leadType,
      httpStatus: 0,
      leadId: null,
      token: null,
      resultUrl: null,
      saveSucceeded: false,
      notificationSuppressed,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printResult(result: SeedResult): void {
  console.log(`\n── ${result.leadType} ──`);
  console.log(`HTTP status:              ${result.httpStatus || "network error"}`);
  console.log(`Save succeeded:           ${result.saveSucceeded ? "yes" : "no"}`);
  console.log(`Lead id:                  ${result.leadId ?? "n/a"}`);
  console.log(`Result token:             ${result.token ?? "n/a"}`);
  console.log(`Result URL:               ${result.resultUrl ?? "n/a"}`);
  console.log(
    `Notification suppressed:  ${result.notificationSuppressed ? "yes" : "no"}`
  );
  if (result.error) {
    console.log(`Error:                    ${result.error}`);
  }
}

async function main(): Promise<void> {
  requireProductionSeedConfirm();
  const siteUrl = requireProductionSiteUrl();
  const suppressNotifications =
    process.env.SUPPRESS_TEST_NOTIFICATIONS === "true";

  console.log("Private Client Property Desk — production test lead seed");
  console.log(`Target:                   ${siteUrl}`);
  console.log(`Notifications suppressed: ${suppressNotifications ? "yes" : "no"}`);
  console.log(`Leads to create:          ${SEED_DEFINITIONS.length}`);

  const results: SeedResult[] = [];

  for (const definition of SEED_DEFINITIONS) {
    console.log(`\nCreating ${definition.kind} test lead...`);
    const payload = buildSeedPayload(definition);
    const result = await seedLead(siteUrl, payload, suppressNotifications);
    results.push(result);
    printResult(result);
  }

  const failed = results.filter((result) => !result.saveSucceeded);
  console.log("\n── Summary ──");
  console.log(`Created: ${results.length - failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.error("\nOne or more test leads failed to seed.");
    process.exit(1);
  }

  console.log("\nVerify in production admin, then delete with:");
  console.log(
    `  PRODUCTION_SITE_URL=${siteUrl} PRODUCTION_TEST_SEED_CONFIRM=true ADMIN_PASSWORD=... npm run seed:prod-leads:cleanup`
  );
  console.log(
    `\nExpected test last names: ${TEST_LAST_NAMES.join(", ")}`
  );
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
