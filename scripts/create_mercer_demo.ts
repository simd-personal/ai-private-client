#!/usr/bin/env tsx
/**
 * Create or reset the Mercer Newport demo lead in Supabase.
 *
 * Usage:
 *   npm run demo:mercer
 */

import { config } from "dotenv";
import { getSupabaseAdmin } from "../src/lib/supabase/server";
import { resetMercerNewportDemo } from "../src/lib/demo/reset-mercer-demo";

config({ path: ".env.local" });

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY missing — AI generation may use fallback.");
  }

  console.log("\n── Mercer Newport Demo Reset ──\n");

  const supabase = getSupabaseAdmin();
  const result = await resetMercerNewportDemo(supabase);

  console.log(`Tenant:           ${result.tenantSlug}`);
  console.log(`Lead ID:          ${result.leadId}`);
  console.log(`Deleted old:      ${result.deletedLeadCount}`);
  console.log(`Readiness:        ${result.readinessScore ?? "—"}`);
  console.log(`Guardrails:       ${result.guardrailsStatus ?? "—"}`);
  console.log(`Data room items:  ${result.dataRoomItemCount}`);
  console.log(`Decision stage:   ${result.decisionStage ?? "—"}`);
  console.log(`AI source:        ${result.aiGenerationSource ?? "—"}`);
  console.log(`AI model:         ${result.aiGenerationModel ?? "—"}`);
  console.log(`Public result:    ${result.publicResultUrl}`);
  console.log(`Admin:            ${result.adminLeadUrl}`);
  console.log(`Presentation:     ${result.presentationUrl}`);
  console.log("\nDemo reset complete.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
