#!/usr/bin/env tsx
/**
 * Verify public result payload does not leak admin-only fields.
 *
 * Usage:
 *   npm run verify:public-safety -- mercer-newport-demo
 */

import { config } from "dotenv";
import { toPublicReport } from "../src/lib/schemas/ai-report";
import { toPublicStrategyRoomData } from "../src/lib/schemas/ai-strategy-room";
import {
  toPublicDecisionLayerData,
  type DataRoomItem,
} from "../src/lib/schemas/decision-layer";
import { getSupabaseAdmin } from "../src/lib/supabase/server";
import {
  getLatestMercerDemoLead,
} from "../src/lib/demo/reset-mercer-demo";
import { MERCER_DEMO_SLUG } from "../src/lib/demo/mercer-demo-tenant";

config({ path: ".env.local" });

const FORBIDDEN_KEYS = [
  "readinessScore",
  "lead_score",
  "leadScore",
  "leadPriorityReason",
  "internalLeadSummary",
  "suggestedFollowUpMessage",
  "leadConcierge",
  "ai_compliance_guardrails",
  "complianceGuardrails",
  "adminSummary",
  "decisionBlockers",
  "meeting_notes",
  "lead_meeting_notes",
  "quiz_data",
  "admin_notes",
  "internalTeamNote",
  "whiteGloveFollowUp",
  "advisorSpecificBriefs",
  "dealReadiness",
  "presentationMode",
  "ai_deal_readiness",
  "ai_white_glove_follow_up",
  "ai_advisor_specific_briefs",
  "ai_presentation_mode",
  "ai_meeting_prep_pack",
  "sessionJourney",
  "lead_events",
  "lead_comments",
] as const;

const REQUIRED_PUBLIC_SECTIONS = [
  { path: "report", label: "report" },
  { path: "strategyRoom", label: "strategyRoom" },
  { path: "strategyRoom.strategyRoom", label: "strategyRoom.strategyRoom" },
  { path: "strategyRoom.scenarioComparison", label: "scenarioComparison" },
  {
    path: "strategyRoom.advisorCoordinationMap",
    label: "advisorCoordinationMap",
  },
  { path: "decisionLayer", label: "decisionLayer" },
  { path: "decisionLayer.decisionGraph", label: "decisionGraph" },
] as const;

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current == null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
}

function collectForbiddenHits(
  value: unknown,
  path = "$",
  hits: string[] = []
): string[] {
  if (value == null) return hits;

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenHits(item, `${path}[${index}]`, hits)
    );
    return hits;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = `${path}.${key}`;
      if (FORBIDDEN_KEYS.includes(key as (typeof FORBIDDEN_KEYS)[number])) {
        hits.push(nextPath);
      }
      collectForbiddenHits(nested, nextPath, hits);
    }
  }

  return hits;
}

function hasDisclaimer(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return (
    text.includes("planning and coordination purposes only") &&
    text.includes("not legal, tax, lending, investment")
  );
}

async function buildPublicPayload(token: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, lead_type, ai_report, created_at, quiz_data, ai_strategy_room, ai_scenario_comparison, ai_advisor_coordination_map, ai_relationship_map, ai_red_flags_missing_info, ai_decision_graph"
    )
    .eq("public_result_token", token)
    .single();

  if (error || !data) {
    throw new Error("Demo lead not found for token");
  }

  const leadType = data.lead_type as
    | "buyer"
    | "seller"
    | "equity"
    | "wealth_forecast";

  const report = toPublicReport(
    leadType,
    data.ai_report as Record<string, unknown>
  );
  const strategyRoom = toPublicStrategyRoomData(data);

  const { data: publicDataRoom } = await supabase
    .from("decision_data_room_items")
    .select("*")
    .eq("lead_id", data.id)
    .eq("visibility", "public");

  const decisionLayer = toPublicDecisionLayerData(
    data,
    (publicDataRoom ?? []) as DataRoomItem[]
  );

  return {
    leadType,
    report,
    strategyRoom,
    decisionLayer,
    createdAt: data.created_at,
  } satisfies Record<string, unknown>;
}

async function fetchTenantDisclaimer(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenants")
    .select("disclaimer_text")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.disclaimer_text as string | null) ?? "";
}

async function main() {
  const slug = process.argv[2]?.trim() ?? MERCER_DEMO_SLUG;

  if (slug !== MERCER_DEMO_SLUG) {
    console.error(`Only ${MERCER_DEMO_SLUG} is supported currently.`);
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase env vars required.");
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  const demo = await getLatestMercerDemoLead(supabase);

  if (!demo?.token) {
    console.error("No Mercer demo lead found. Run: npm run demo:mercer");
    process.exit(1);
  }

  console.log(`\n── Public Safety Verification (${slug}) ──\n`);
  console.log(`Token: ${demo.token.slice(0, 8)}…`);

  const payload = await buildPublicPayload(demo.token);
  const tenantDisclaimer = await fetchTenantDisclaimer(slug);
  const forbiddenHits = collectForbiddenHits(payload);
  const presentSections = REQUIRED_PUBLIC_SECTIONS.filter(
    ({ path }) => getNestedValue(payload, path) != null
  );
  const disclaimerOk =
    hasDisclaimer(payload) ||
    (tenantDisclaimer.toLowerCase().includes("planning and coordination purposes only") &&
      tenantDisclaimer.toLowerCase().includes("not legal, tax, lending, investment"));

  console.log("\nForbidden field check:");
  if (forbiddenHits.length === 0) {
    console.log("  ✓ No forbidden keys found in public payload");
  } else {
    forbiddenHits.forEach((hit) => console.log(`  ✗ ${hit}`));
  }

  console.log("\nChecked forbidden keys:");
  FORBIDDEN_KEYS.forEach((key) => console.log(`  • ${key}`));

  console.log("\nPublic sections present:");
  REQUIRED_PUBLIC_SECTIONS.forEach(({ path, label }) => {
    const present = getNestedValue(payload, path) != null;
    console.log(`  ${present ? "✓" : "○"} ${label}`);
  });

  console.log(`\nDisclaimer present: ${disclaimerOk ? "✓ yes" : "✗ no"}`);

  const passed =
    forbiddenHits.length === 0 &&
    presentSections.some((section) => section.path === "report") &&
    presentSections.some((section) => section.path === "strategyRoom") &&
    disclaimerOk;

  console.log(`\nResult: ${passed ? "PASS" : "FAIL"}\n`);
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
