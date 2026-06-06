import { z } from "zod";

export const GENERATION_STATUSES = [
  "intake_received",
  "generating",
  "partially_ready",
  "complete",
  "failed",
] as const;

export const STAGE_STATUSES = [
  "pending",
  "running",
  "ready",
  "failed",
  "skipped",
] as const;

export const GENERATION_STAGE_KEYS = [
  "base_report",
  "lead_concierge",
  "strategy_room",
  "decision_layer",
  "advisor_action_board",
  "presentation",
] as const;

export type GenerationStatus = (typeof GENERATION_STATUSES)[number];
export type StageStatus = (typeof STAGE_STATUSES)[number];
export type GenerationStageKey = (typeof GENERATION_STAGE_KEYS)[number];

export const generationProgressSchema = z.object({
  currentStage: z.string().optional(),
  completedStages: z.array(z.string()).optional(),
  failedStages: z.array(z.string()).optional(),
  percent: z.number().optional(),
  lastUpdatedAt: z.string().optional(),
});

export type GenerationProgress = z.infer<typeof generationProgressSchema>;

export const publicGenerationStatusSchema = z.object({
  generationStatus: z.enum(GENERATION_STATUSES),
  generationProgress: generationProgressSchema,
  baseReportStatus: z.enum(STAGE_STATUSES),
  strategyRoomStatus: z.enum(STAGE_STATUSES),
  decisionLayerStatus: z.enum(STAGE_STATUSES),
  advisorActionBoardStatus: z.enum(STAGE_STATUSES),
  presentationStatus: z.enum(STAGE_STATUSES),
  isReady: z.boolean(),
  isPartiallyReady: z.boolean(),
  publicSectionsReady: z.object({
    report: z.boolean(),
    strategyRoom: z.boolean(),
    scenarioComparison: z.boolean(),
    advisorMap: z.boolean(),
    decisionGraph: z.boolean(),
    advisorReviewPlan: z.boolean(),
  }),
});

export type PublicGenerationStatus = z.infer<typeof publicGenerationStatusSchema>;

const STAGE_COLUMN_MAP: Record<
  GenerationStageKey,
  | "base_report_status"
  | "strategy_room_status"
  | "decision_layer_status"
  | "advisor_action_board_status"
  | "presentation_status"
> = {
  base_report: "base_report_status",
  lead_concierge: "base_report_status",
  strategy_room: "strategy_room_status",
  decision_layer: "decision_layer_status",
  advisor_action_board: "advisor_action_board_status",
  presentation: "presentation_status",
};

export function stageStatusColumn(
  stage: GenerationStageKey
): (typeof STAGE_COLUMN_MAP)[GenerationStageKey] {
  return STAGE_COLUMN_MAP[stage];
}

export function isAsyncLeadGenerationEnabled(): boolean {
  return process.env.ASYNC_LEAD_GENERATION !== "false";
}

export function initialGenerationColumns() {
  return {
    generation_status: "intake_received" as const,
    generation_progress: {},
    base_report_status: "pending" as const,
    strategy_room_status: "pending" as const,
    decision_layer_status: "pending" as const,
    advisor_action_board_status: "pending" as const,
    presentation_status: "pending" as const,
  };
}

export function computeGenerationPercent(
  completedStages: string[],
  failedStages: string[] = []
): number {
  const total = GENERATION_STAGE_KEYS.length;
  const done = new Set([...completedStages, ...failedStages]).size;
  return Math.min(100, Math.round((done / total) * 100));
}

export function deriveOverallGenerationStatus(input: {
  base_report_status?: string | null;
  strategy_room_status?: string | null;
  decision_layer_status?: string | null;
  advisor_action_board_status?: string | null;
  presentation_status?: string | null;
}): GenerationStatus {
  const statuses = [
    input.base_report_status,
    input.strategy_room_status,
    input.decision_layer_status,
    input.advisor_action_board_status,
    input.presentation_status,
  ].filter(Boolean) as string[];

  if (statuses.every((s) => s === "ready" || s === "skipped")) {
    return "complete";
  }

  const criticalReady =
    input.base_report_status === "ready" || input.base_report_status === "skipped";
  const anyReady = statuses.some((s) => s === "ready");
  const allFailed = statuses.length > 0 && statuses.every((s) => s === "failed");
  const anyFailed = statuses.some((s) => s === "failed");
  const anyRunning = statuses.some((s) => s === "running");
  const anyPending = statuses.some((s) => s === "pending");

  if (allFailed && !anyReady) return "failed";
  if (anyReady && (anyFailed || anyPending)) return "partially_ready";
  if (criticalReady && anyReady) return "partially_ready";
  if (anyRunning) return "generating";
  if (anyPending && !anyReady) return "intake_received";
  return "generating";
}

export function buildPublicSectionsReady(lead: {
  base_report_status?: string | null;
  strategy_room_status?: string | null;
  decision_layer_status?: string | null;
  advisor_action_board_status?: string | null;
  ai_strategy_room?: unknown;
  ai_scenario_comparison?: unknown;
  ai_advisor_coordination_map?: unknown;
  ai_decision_graph?: unknown;
  ai_advisor_action_board?: unknown;
  ai_report?: unknown;
}): PublicGenerationStatus["publicSectionsReady"] {
  const reportReady =
    lead.base_report_status === "ready" && lead.ai_report != null;
  const strategyReady = lead.strategy_room_status === "ready";

  return {
    report: reportReady,
    strategyRoom: strategyReady && lead.ai_strategy_room != null,
    scenarioComparison: strategyReady && lead.ai_scenario_comparison != null,
    advisorMap: strategyReady && lead.ai_advisor_coordination_map != null,
    decisionGraph:
      lead.decision_layer_status === "ready" && lead.ai_decision_graph != null,
    advisorReviewPlan:
      lead.advisor_action_board_status === "ready" &&
      lead.ai_advisor_action_board != null,
  };
}

export function toPublicGenerationStatus(lead: {
  generation_status?: string | null;
  generation_progress?: unknown;
  base_report_status?: string | null;
  strategy_room_status?: string | null;
  decision_layer_status?: string | null;
  advisor_action_board_status?: string | null;
  presentation_status?: string | null;
  ai_strategy_room?: unknown;
  ai_scenario_comparison?: unknown;
  ai_advisor_coordination_map?: unknown;
  ai_decision_graph?: unknown;
  ai_advisor_action_board?: unknown;
  ai_report?: unknown;
}): PublicGenerationStatus {
  const generationStatus = (lead.generation_status ??
    "intake_received") as GenerationStatus;
  const progressParsed = generationProgressSchema.safeParse(
    lead.generation_progress ?? {}
  );
  const generationProgress = progressParsed.success
    ? progressParsed.data
    : {};

  const baseReportStatus = (lead.base_report_status ?? "pending") as StageStatus;
  const strategyRoomStatus = (lead.strategy_room_status ??
    "pending") as StageStatus;
  const decisionLayerStatus = (lead.decision_layer_status ??
    "pending") as StageStatus;
  const advisorActionBoardStatus = (lead.advisor_action_board_status ??
    "pending") as StageStatus;
  const presentationStatus = (lead.presentation_status ??
    "pending") as StageStatus;

  const publicSectionsReady = buildPublicSectionsReady(lead);
  const isReady = generationStatus === "complete";
  const isPartiallyReady =
    generationStatus === "partially_ready" ||
    Object.values(publicSectionsReady).some(Boolean);

  return {
    generationStatus,
    generationProgress,
    baseReportStatus,
    strategyRoomStatus,
    decisionLayerStatus,
    advisorActionBoardStatus,
    presentationStatus,
    isReady,
    isPartiallyReady,
    publicSectionsReady,
  };
}
