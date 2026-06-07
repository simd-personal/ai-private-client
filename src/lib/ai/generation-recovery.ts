import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type GenerationProgress,
  type GenerationStageKey,
  generationProgressSchema,
} from "@/lib/schemas/lead-generation";
import { updateLeadGenerationStage } from "@/lib/ai/lead-generation-status";

const STALE_RUNNING_MS = 90 * 1000;
const RECOVERY_COOLDOWN_MS = 2 * 60 * 1000;

type LeadGenerationRow = {
  id: string;
  tenant_id?: string | null;
  generation_status?: string | null;
  generation_started_at?: string | null;
  generation_progress?: unknown;
  public_result_ready_at?: string | null;
  base_report_status?: string | null;
  strategy_room_status?: string | null;
  decision_layer_status?: string | null;
  advisor_action_board_status?: string | null;
  presentation_status?: string | null;
  ai_report?: unknown;
};

function parseProgress(raw: unknown): GenerationProgress {
  const parsed = generationProgressSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

function stageFromStatusColumn(
  column: keyof LeadGenerationRow
): GenerationStageKey | null {
  switch (column) {
    case "base_report_status":
      return "base_report";
    case "strategy_room_status":
      return "strategy_room";
    case "decision_layer_status":
      return "decision_layer";
    case "advisor_action_board_status":
      return "advisor_action_board";
    case "presentation_status":
      return "presentation";
    default:
      return null;
  }
}

export function isGenerationStale(lead: LeadGenerationRow): boolean {
  if (
    lead.generation_status !== "generating" &&
    lead.generation_status !== "partially_ready"
  ) {
    return false;
  }

  const progress = parseProgress(lead.generation_progress);
  const lastUpdatedAt = progress.lastUpdatedAt
    ? Date.parse(progress.lastUpdatedAt)
    : lead.generation_started_at
      ? Date.parse(lead.generation_started_at)
      : NaN;

  if (!Number.isFinite(lastUpdatedAt)) return false;

  const recoveryAt = progress.recoveryAttemptAt
    ? Date.parse(progress.recoveryAttemptAt)
    : NaN;
  if (
    Number.isFinite(recoveryAt) &&
    Date.now() - recoveryAt < RECOVERY_COOLDOWN_MS
  ) {
    return false;
  }

  const runningStages = (
    [
      "base_report_status",
      "strategy_room_status",
      "decision_layer_status",
      "advisor_action_board_status",
      "presentation_status",
    ] as const
  ).some((column) => lead[column] === "running");

  if (!runningStages) return false;

  return Date.now() - lastUpdatedAt >= STALE_RUNNING_MS;
}

export async function resetStaleRunningStages(
  supabase: SupabaseClient,
  leadId: string,
  lead: LeadGenerationRow
): Promise<void> {
  const progress = parseProgress(lead.generation_progress);
  const lastUpdatedAt = progress.lastUpdatedAt
    ? Date.parse(progress.lastUpdatedAt)
    : NaN;
  const isStale =
    Number.isFinite(lastUpdatedAt) &&
    Date.now() - lastUpdatedAt >= STALE_RUNNING_MS;

  if (!isStale) return;

  for (const column of [
    "base_report_status",
    "strategy_room_status",
    "decision_layer_status",
    "advisor_action_board_status",
    "presentation_status",
  ] as const) {
    if (lead[column] !== "running") continue;
    const stage = stageFromStatusColumn(column);
    if (!stage) continue;
    await updateLeadGenerationStage(supabase, leadId, stage, "pending");
  }
}

export async function markGenerationRecoveryAttempt(
  supabase: SupabaseClient,
  leadId: string,
  lead: LeadGenerationRow
): Promise<void> {
  const progress = parseProgress(lead.generation_progress);
  await supabase
    .from("leads")
    .update({
      generation_progress: {
        ...progress,
        recoveryAttemptAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
    })
    .eq("id", leadId);
}

export function inferGenerationPhase(
  lead: LeadGenerationRow
): "base" | "extended" {
  if (lead.ai_report != null && lead.base_report_status === "ready") {
    return "extended";
  }
  return "base";
}

export function isGenerationComplete(lead: LeadGenerationRow): boolean {
  return (
    lead.generation_status === "complete" ||
    (lead.base_report_status === "ready" &&
      lead.strategy_room_status === "ready" &&
      lead.decision_layer_status === "ready" &&
      lead.advisor_action_board_status === "ready" &&
      lead.presentation_status === "ready")
  );
}

export function shouldKickstartGeneration(lead: LeadGenerationRow): boolean {
  if (!lead.public_result_ready_at && !lead.id) return false;
  if (lead.generation_started_at) return false;
  if (lead.generation_status !== "intake_received") return false;
  if (lead.base_report_status !== "pending") return false;
  if (lead.ai_report != null) return false;

  const startedAt = lead.public_result_ready_at
    ? Date.parse(lead.public_result_ready_at)
    : NaN;
  if (!Number.isFinite(startedAt)) return false;

  const progress = parseProgress(lead.generation_progress);
  const recoveryAt = progress.recoveryAttemptAt
    ? Date.parse(progress.recoveryAttemptAt)
    : NaN;
  if (
    Number.isFinite(recoveryAt) &&
    Date.now() - recoveryAt < RECOVERY_COOLDOWN_MS
  ) {
    return false;
  }

  return Date.now() - startedAt >= 15 * 1000;
}

export async function maybeKickstartLeadGeneration(
  supabase: SupabaseClient,
  lead: LeadGenerationRow,
  schedule: (input: {
    leadId: string;
    tenantId: string | null;
    phase: "base" | "extended";
  }) => Promise<void>
): Promise<void> {
  if (!lead.id || !shouldKickstartGeneration(lead)) return;

  await markGenerationRecoveryAttempt(supabase, lead.id, lead);
  await schedule({
    leadId: lead.id,
    tenantId: lead.tenant_id ?? null,
    phase: "base",
  });
}

export async function maybeRecoverStaleLeadGeneration(
  supabase: SupabaseClient,
  lead: LeadGenerationRow,
  schedule: (input: {
    leadId: string;
    tenantId: string | null;
    phase: "base" | "extended";
  }) => Promise<void>
): Promise<void> {
  if (!lead.id || isGenerationComplete(lead) || !isGenerationStale(lead)) {
    return;
  }

  await resetStaleRunningStages(supabase, lead.id, lead);
  await markGenerationRecoveryAttempt(supabase, lead.id, lead);

  await schedule({
    leadId: lead.id,
    tenantId: lead.tenant_id ?? null,
    phase: inferGenerationPhase(lead),
  });
}
