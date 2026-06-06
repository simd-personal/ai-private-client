#!/usr/bin/env tsx
/**
 * Verify Supabase cloud schema from the terminal.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: npm run supabase:verify
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const REQUIRED_TABLES = [
  "leads",
  "lead_events",
  "tenants",
  "site_events",
  "lead_comments",
  "tenant_domains",
  "decision_data_room_items",
  "decision_versions",
  "lead_meeting_notes",
  "advisor_action_items",
] as const;

const REQUIRED_LEAD_COLUMNS = [
  "public_result_token",
  "report_source",
  "tenant_id",
  "lead_status",
  "ai_strategy_room",
  "ai_decision_graph",
  "ai_compliance_guardrails",
  "ai_data_room_suggestions",
  "decision_stage",
  "ai_advisor_action_board",
  "generation_status",
  "generation_progress",
  "base_report_status",
  "strategy_room_status",
  "decision_layer_status",
  "advisor_action_board_status",
  "presentation_status",
  "fast_public_brief",
  "fast_public_brief_generated_at",
  "public_result_ready_at",
] as const;

const REQUIRED_TENANT_SLUGS = ["private-client", "demo-agent"] as const;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!url) fail("SUPABASE_URL is missing in .env.local");
  if (!key) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY is missing in .env.local\n" +
        "  Get it from Supabase → Settings → API → Secret key"
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Checking Supabase schema at ${url}\n`);

  const issues: string[] = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      issues.push(`MISSING TABLE or no access: ${table} (${error.message})`);
    } else {
      console.log(`✓ table: ${table}`);
    }
  }

  const { data: tenantRows, error: tenantError } = await supabase
    .from("tenants")
    .select("slug")
    .in("slug", [...REQUIRED_TENANT_SLUGS]);

  if (tenantError) {
    issues.push(`Could not read tenants: ${tenantError.message}`);
  } else {
    const found = new Set((tenantRows ?? []).map((r) => r.slug));
    for (const slug of REQUIRED_TENANT_SLUGS) {
      if (found.has(slug)) console.log(`✓ tenant: ${slug}`);
      else issues.push(`MISSING TENANT ROW: ${slug}`);
    }
  }

  const { data: sampleLead, error: leadSampleError } = await supabase
    .from("leads")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (leadSampleError && !leadSampleError.message.includes("0 rows")) {
    issues.push(`Could not inspect leads columns: ${leadSampleError.message}`);
  } else if (sampleLead) {
    for (const col of REQUIRED_LEAD_COLUMNS) {
      if (!(col in sampleLead)) issues.push(`MISSING COLUMN on leads: ${col}`);
      else console.log(`✓ leads column: ${col}`);
    }
  } else {
    // Empty table — probe columns with a minimal invalid insert error, or use RPC
    // Fallback: select explicit columns; PostgREST returns error if column missing
    for (const col of REQUIRED_LEAD_COLUMNS) {
      const { error } = await supabase.from("leads").select(col).limit(0);
      if (error?.message.includes("column") && error.message.includes("does not exist")) {
        issues.push(`MISSING COLUMN on leads: ${col}`);
      } else if (error && !error.message.includes("0 rows")) {
        issues.push(`Could not verify leads.${col}: ${error.message}`);
      } else {
        console.log(`✓ leads column: ${col}`);
      }
    }
  }

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    issues.push(`Could not list storage buckets: ${bucketError.message}`);
  } else if (!buckets?.some((b) => b.id === "tenant-logos")) {
    issues.push("MISSING STORAGE BUCKET: tenant-logos (optional, for logo uploads)");
  } else {
    console.log("✓ storage bucket: tenant-logos");
  }

  console.log("");
  if (issues.length === 0) {
    console.log("All required schema checks passed.\n");
    return;
  }

  console.log("Issues found:\n");
  for (const issue of issues) console.log(`  • ${issue}`);
  console.log(
    "\nFix: Supabase Dashboard → SQL Editor → run migrations 017–019 or supabase/cloud-bootstrap.sql\n"
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
