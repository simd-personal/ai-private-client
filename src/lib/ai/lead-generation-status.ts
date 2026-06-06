import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeGenerationPercent,
  deriveOverallGenerationStatus,
  type GenerationProgress,
  type GenerationStageKey,
  type StageStatus,
  stageStatusColumn,
} from "@/lib/schemas/lead-generation";

type LeadStageRow = {
  generation_progress?: unknown;
  base_report_status?: string | null;
  strategy_room_status?: string | null;
  decision_layer_status?: string | null;
  advisor_action_board_status?: string | null;
  presentation_status?: string | null;
};

function parseProgress(raw: unknown): GenerationProgress {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as GenerationProgress;
  return {
    currentStage: value.currentStage,
    completedStages: Array.isArray(value.completedStages)
      ? value.completedStages
      : [],
    failedStages: Array.isArray(value.failedStages) ? value.failedStages : [],
    percent: typeof value.percent === "number" ? value.percent : 0,
    lastUpdatedAt: value.lastUpdatedAt,
  };
}

export async function markLeadGenerationStarted(
  supabase: SupabaseClient,
  leadId: string
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("leads")
    .update({
      generation_status: "generating",
      generation_started_at: now,
      generation_progress: {
        currentStage: "base_report",
        completedStages: [],
        failedStages: [],
        percent: 0,
        lastUpdatedAt: now,
      },
    })
    .eq("id", leadId);
}

export async function updateLeadGenerationStage(
  supabase: SupabaseClient,
  leadId: string,
  stage: GenerationStageKey,
  status: StageStatus,
  options?: { error?: string }
): Promise<void> {
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "generation_progress, base_report_status, strategy_room_status, decision_layer_status, advisor_action_board_status, presentation_status"
    )
    .eq("id", leadId)
    .maybeSingle();

  const progress = parseProgress(lead?.generation_progress);
  const completedStages = new Set(progress.completedStages ?? []);
  const failedStages = new Set(progress.failedStages ?? []);

  if (status === "ready" || status === "skipped") {
    completedStages.add(stage);
    failedStages.delete(stage);
  }
  if (status === "failed") {
    failedStages.add(stage);
  }

  const nextProgress: GenerationProgress = {
    currentStage: status === "running" ? stage : progress.currentStage,
    completedStages: [...completedStages],
    failedStages: [...failedStages],
    percent: computeGenerationPercent(
      [...completedStages],
      [...failedStages]
    ),
    lastUpdatedAt: new Date().toISOString(),
  };

  const column = stageStatusColumn(stage);
  const patch: Record<string, unknown> = {
    [column]: status,
    generation_progress: nextProgress,
  };

  if (options?.error) {
    patch.generation_error = options.error.slice(0, 500);
  }

  const merged = {
    ...(lead ?? {}),
    ...patch,
  } as LeadStageRow;

  patch.generation_status = deriveOverallGenerationStatus(merged);

  if (patch.generation_status === "complete") {
    patch.generation_completed_at = new Date().toISOString();
  }

  await supabase.from("leads").update(patch).eq("id", leadId);
}

export async function markLeadGenerationFailed(
  supabase: SupabaseClient,
  leadId: string,
  stage: GenerationStageKey,
  errorMessage: string
): Promise<void> {
  await updateLeadGenerationStage(supabase, leadId, stage, "failed", {
    error: errorMessage,
  });

  await supabase
    .from("leads")
    .update({
      generation_status: "failed",
      generation_error: errorMessage.slice(0, 500),
    })
    .eq("id", leadId);
}

export async function markLeadGenerationComplete(
  supabase: SupabaseClient,
  leadId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "base_report_status, strategy_room_status, decision_layer_status, advisor_action_board_status, presentation_status"
    )
    .eq("id", leadId)
    .maybeSingle();

  const overall = lead
    ? deriveOverallGenerationStatus(lead)
    : "complete";

  const finalStatus =
    overall === "generating" || overall === "intake_received"
      ? "partially_ready"
      : overall;

  await supabase
    .from("leads")
    .update({
      generation_status: finalStatus,
      generation_completed_at: now,
    })
    .eq("id", leadId);
}
