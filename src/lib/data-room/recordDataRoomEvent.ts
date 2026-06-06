import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTimelineSummary,
  createDecisionVersion,
} from "@/lib/decision/createDecisionVersion";

export async function refreshLeadTimeline(
  supabase: SupabaseClient,
  leadId: string
): Promise<void> {
  const { data: lead } = await supabase
    .from("leads")
    .select("decision_stage")
    .eq("id", leadId)
    .maybeSingle();

  const timeline = await buildTimelineSummary(
    supabase,
    leadId,
    (lead?.decision_stage as string | null) ?? null
  );

  await supabase
    .from("leads")
    .update({ ai_decision_timeline_summary: timeline })
    .eq("id", leadId);
}

export async function recordDataRoomEvent(
  supabase: SupabaseClient,
  input: {
    tenantId: string | null;
    leadId: string;
    changeSource: string;
    timelineMessage: string;
    snapshot: Record<string, unknown>;
  }
): Promise<void> {
  await createDecisionVersion(supabase, {
    tenantId: input.tenantId,
    leadId: input.leadId,
    changeSource: input.changeSource,
    newSnapshot: input.snapshot,
    timelineSummary: input.timelineMessage,
  });

  await refreshLeadTimeline(supabase, input.leadId);
}
