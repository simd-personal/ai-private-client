import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateDecisionVersionInput {
  tenantId: string | null;
  leadId: string;
  changeSource: string;
  changedBy?: string | null;
  previousSnapshot?: Record<string, unknown> | null;
  newSnapshot?: Record<string, unknown> | null;
  timelineSummary?: string;
}

export interface DecisionChangeSummary {
  changedFields: string[];
  summary: string;
  implications: string[];
  newNextSteps: string[];
}

function buildChangeSummary(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined
): DecisionChangeSummary {
  const prev = previous ?? {};
  const curr = next ?? {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  const changedFields = [...allKeys].filter(
    (k) => JSON.stringify(prev[k]) !== JSON.stringify(curr[k])
  );

  return {
    changedFields,
    summary:
      changedFields.length > 0
        ? `Updated: ${changedFields.slice(0, 5).join(", ")}`
        : "Decision record updated.",
    implications: changedFields.includes("decision_stage")
      ? ["Decision stage advanced — advisor coordination may shift."]
      : ["Advisory team should review updated decision context."],
    newNextSteps: changedFields.includes("ai_decision_graph")
      ? ["Review decision graph for new blockers or next actions."]
      : ["Continue advisor coordination per current plan."],
  };
}

export async function getNextVersionNumber(
  supabase: SupabaseClient,
  leadId: string
): Promise<number> {
  const { data } = await supabase
    .from("decision_versions")
    .select("version_number")
    .eq("lead_id", leadId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.version_number ?? 0) + 1;
}

export async function createDecisionVersion(
  supabase: SupabaseClient,
  input: CreateDecisionVersionInput
): Promise<void> {
  const versionNumber = await getNextVersionNumber(supabase, input.leadId);
  const baseSummary = buildChangeSummary(
    input.previousSnapshot,
    input.newSnapshot
  );
  const aiChangeSummary = input.timelineSummary
    ? { ...baseSummary, summary: input.timelineSummary }
    : baseSummary;

  const { error } = await supabase.from("decision_versions").insert({
    tenant_id: input.tenantId,
    lead_id: input.leadId,
    version_number: versionNumber,
    change_source: input.changeSource,
    changed_by: input.changedBy ?? null,
    previous_snapshot: input.previousSnapshot ?? null,
    new_snapshot: input.newSnapshot ?? null,
    ai_change_summary: aiChangeSummary,
  });

  if (error) {
    console.error("[decision-version] insert failed:", error.message);
    throw new Error(error.message);
  }
}

export async function buildTimelineSummary(
  supabase: SupabaseClient,
  leadId: string,
  decisionStage: string | null
): Promise<{
  latestVersion: number;
  headline: string;
  currentStage: string;
  recentChanges: string[];
  nextSteps: string[];
}> {
  const { data: versions } = await supabase
    .from("decision_versions")
    .select("version_number, change_source, ai_change_summary, created_at")
    .eq("lead_id", leadId)
    .order("version_number", { ascending: false })
    .limit(5);

  const latest = versions?.[0];
  const recentChanges =
    versions?.map(
      (v) =>
        (v.ai_change_summary as DecisionChangeSummary | null)?.summary ??
        v.change_source
    ) ?? [];

  const nextSteps =
    (latest?.ai_change_summary as DecisionChangeSummary | null)?.newNextSteps ??
    [];

  return {
    latestVersion: latest?.version_number ?? 0,
    headline: latest
      ? `Version ${latest.version_number}: ${latest.change_source.replace(/_/g, " ")}`
      : "No decision versions yet",
    currentStage: decisionStage ?? "exploration",
    recentChanges,
    nextSteps,
  };
}
