/**
 * List production test leads and print cleanup SQL.
 *
 * Usage:
 *   PRODUCTION_SITE_URL=https://your-domain.com \
 *   PRODUCTION_TEST_SEED_CONFIRM=true \
 *   ADMIN_PASSWORD=your-admin-password \
 *   npm run seed:prod-leads:cleanup
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const TEST_LAST_NAMES = [
  "Buyer Lead",
  "Seller Lead",
  "Equity Lead",
  "Wealth Lead",
] as const;

interface AdminLead {
  id: string;
  created_at: string;
  lead_type: string;
  first_name: string;
  last_name: string;
  email: string;
}

function requireProductionSeedConfirm(): void {
  if (process.env.PRODUCTION_TEST_SEED_CONFIRM !== "true") {
    console.error(`
Refusing to inspect/delete production test leads.

Set PRODUCTION_TEST_SEED_CONFIRM=true to confirm this operation targets production.
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
  PRODUCTION_SITE_URL=https://your-domain.com PRODUCTION_TEST_SEED_CONFIRM=true ADMIN_PASSWORD=... npm run seed:prod-leads:cleanup
`);
    process.exit(1);
  }

  return url.replace(/\/$/, "");
}

function requireAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) {
    console.error(`
ADMIN_PASSWORD is required to list production test leads from the admin API.
`);
    process.exit(1);
  }

  return password;
}

function isProductionTestLead(lead: AdminLead): boolean {
  return (
    lead.first_name === "Test" &&
    TEST_LAST_NAMES.includes(
      lead.last_name as (typeof TEST_LAST_NAMES)[number]
    )
  );
}

function printCleanupSql(): void {
  const lastNameList = TEST_LAST_NAMES.map((name) => `'${name}'`).join(", ");

  console.log(`
Run this SQL in Supabase SQL Editor to delete seeded production test leads:

delete from public.leads
where first_name = 'Test'
  and last_name in (${lastNameList});

Related rows in public.lead_events are removed automatically via ON DELETE CASCADE.
`);
}

async function main(): Promise<void> {
  requireProductionSeedConfirm();
  const siteUrl = requireProductionSiteUrl();
  const adminPassword = requireAdminPassword();

  console.log("Private Client Property Desk — production test lead cleanup");
  console.log(`Target: ${siteUrl}`);

  const response = await fetch(`${siteUrl}/api/admin/leads`, {
    headers: {
      Authorization: `Bearer ${adminPassword}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `Failed to fetch admin leads (${response.status}): ${body || response.statusText}`
    );
    printCleanupSql();
    process.exit(1);
  }

  const payload = (await response.json()) as { leads?: AdminLead[] };
  const leads = payload.leads ?? [];
  const testLeads = leads.filter(isProductionTestLead);

  console.log(`\nFound ${testLeads.length} matching production test lead(s):\n`);

  if (testLeads.length === 0) {
    console.log("No Test / Buyer Lead / Seller Lead / Equity Lead / Wealth Lead rows found.");
  } else {
    for (const lead of testLeads) {
      console.log(
        `- ${lead.lead_type} | ${lead.first_name} ${lead.last_name} | ${lead.email} | ${lead.id} | ${lead.created_at}`
      );
    }
  }

  printCleanupSql();
}

main().catch((error) => {
  console.error("Cleanup script failed:", error);
  process.exit(1);
});
