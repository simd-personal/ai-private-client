import { z } from "zod";

export const ADVISOR_BOARD_STAGES = [
  "exploration",
  "planning",
  "advisor_review",
  "execution_preparation",
] as const;

export const ADVISOR_ROLES = [
  "wealth_advisor",
  "cpa",
  "attorney",
  "lender_private_banker",
  "real_estate_agent",
  "family_office_director",
  "insurance_risk_advisor",
  "other",
] as const;

export const LANE_STATUSES = [
  "not_started",
  "needs_review",
  "ready_for_meeting",
  "waiting_on_client",
  "waiting_on_document",
  "in_progress",
  "complete",
] as const;

export const LANE_URGENCY_LEVELS = ["low", "medium", "high"] as const;

export const BLOCKER_SEVERITIES = ["low", "medium", "high"] as const;

export const advisorRoleSchema = z.enum(ADVISOR_ROLES);
export const laneStatusSchema = z.enum(LANE_STATUSES);
export const laneUrgencySchema = z.enum(LANE_URGENCY_LEVELS);

export const relatedDataRoomItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  category: z.string(),
  itemName: z.string(),
  status: z.string(),
  priority: z.string(),
});

export const advisorNextBestPathStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string(),
  ownerRole: advisorRoleSchema,
  reason: z.string(),
  clientSafeLanguage: z.string(),
  adminOnlyNote: z.string(),
});

export const advisorActionLaneSchema = z.object({
  id: z.string(),
  advisorRole: advisorRoleSchema,
  displayName: z.string(),
  status: laneStatusSchema,
  urgency: laneUrgencySchema,
  laneSummary: z.string(),
  whyThisAdvisorMatters: z.string(),
  nextAction: z.string(),
  questionsToAsk: z.array(z.string()),
  missingInformation: z.array(z.string()),
  relatedDataRoomItems: z.array(relatedDataRoomItemSchema),
  decisionDependencies: z.array(z.string()),
  clientSafeSummary: z.string(),
  adminOnlyNote: z.string(),
  suggestedOwnerName: z.string().optional(),
  targetTiming: z.string(),
  canShareWithClient: z.boolean(),
});

export const advisorDecisionBlockerSchema = z.object({
  id: z.string(),
  blocker: z.string(),
  blockedArea: z.string(),
  ownerRole: advisorRoleSchema,
  severity: z.enum(BLOCKER_SEVERITIES),
  whyItMatters: z.string(),
  suggestedResolution: z.string(),
  clientSafeLanguage: z.string(),
  adminOnlyNote: z.string(),
});

export const advisorActionBoardSchema = z.object({
  boardTitle: z.string(),
  caseSummary: z.string(),
  primaryCoordinationNeed: z.string(),
  overallStage: z.enum(ADVISOR_BOARD_STAGES),
  nextBestPath: z.array(advisorNextBestPathStepSchema),
  lanes: z.array(advisorActionLaneSchema),
  blockers: z.array(advisorDecisionBlockerSchema),
  clientSafeSummary: z.string(),
  adminSummary: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  model: z.string(),
  stale: z.boolean(),
  staleReason: z.string().optional(),
});

export type AdvisorRole = z.infer<typeof advisorRoleSchema>;
export type LaneStatus = z.infer<typeof laneStatusSchema>;
export type LaneUrgency = z.infer<typeof laneUrgencySchema>;
export type RelatedDataRoomItem = z.infer<typeof relatedDataRoomItemSchema>;
export type AdvisorNextBestPathStep = z.infer<
  typeof advisorNextBestPathStepSchema
>;
export type PublicAdvisorNextBestPathStep = Omit<
  AdvisorNextBestPathStep,
  "adminOnlyNote"
>;
export type AdvisorActionLane = z.infer<typeof advisorActionLaneSchema>;
export type PublicAdvisorActionLane = Omit<AdvisorActionLane, "adminOnlyNote">;
export type AdvisorDecisionBlocker = z.infer<
  typeof advisorDecisionBlockerSchema
>;
export type AdvisorActionBoard = z.infer<typeof advisorActionBoardSchema>;

export type PublicAdvisorActionBoard = Omit<
  AdvisorActionBoard,
  | "adminSummary"
  | "blockers"
  | "staleReason"
  | "stale"
  | "nextBestPath"
  | "lanes"
> & {
  nextBestPath: PublicAdvisorNextBestPathStep[];
  lanes: PublicAdvisorActionLane[];
};

export const ADVISOR_ACTION_ITEM_STATUSES = [
  "open",
  "in_progress",
  "waiting_on_client",
  "waiting_on_advisor",
  "complete",
  "not_needed",
] as const;

export const advisorActionItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  lead_id: z.string().uuid(),
  lane_role: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(ADVISOR_ACTION_ITEM_STATUSES),
  priority: z.enum(LANE_URGENCY_LEVELS),
  owner_name: z.string().nullable(),
  owner_role: z.string().nullable(),
  due_date: z.string().nullable(),
  related_data_room_item_id: z.string().uuid().nullable(),
  client_visible: z.boolean(),
  admin_notes: z.string().nullable(),
  created_by: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AdvisorActionItem = z.infer<typeof advisorActionItemSchema>;

export type PublicAdvisorActionItem = Pick<
  AdvisorActionItem,
  | "id"
  | "lane_role"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "owner_role"
  | "due_date"
>;

const ROLE_LABELS: Record<AdvisorRole, string> = {
  wealth_advisor: "Wealth Advisor",
  cpa: "CPA",
  attorney: "Attorney",
  lender_private_banker: "Lender / Private Banker",
  real_estate_agent: "Licensed Agent",
  family_office_director: "Family Office Director",
  insurance_risk_advisor: "Insurance / Risk Advisor",
  other: "Advisor",
};

const LANE_STATUS_LABELS: Record<LaneStatus, string> = {
  not_started: "Not started",
  needs_review: "Needs review",
  ready_for_meeting: "Ready for meeting",
  waiting_on_client: "Waiting on client",
  waiting_on_document: "Waiting on document",
  in_progress: "In progress",
  complete: "Complete",
};

const LANE_URGENCY_LABELS: Record<LaneUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function getAdvisorRoleLabel(role: AdvisorRole | string): string {
  return ROLE_LABELS[role as AdvisorRole] ?? "Advisor";
}

export function getLaneStatusLabel(status: LaneStatus | string): string {
  return LANE_STATUS_LABELS[status as LaneStatus] ?? status;
}

export function getLaneUrgencyLabel(urgency: LaneUrgency | string): string {
  return LANE_URGENCY_LABELS[urgency as LaneUrgency] ?? urgency;
}

export function parseAdvisorActionBoard(value: unknown): AdvisorActionBoard | null {
  if (value == null) return null;
  const parsed = advisorActionBoardSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toPublicAdvisorActionBoard(
  board: AdvisorActionBoard | null
): PublicAdvisorActionBoard | null {
  if (!board) return null;

  const {
    adminSummary: _adminSummary,
    blockers: _blockers,
    staleReason: _staleReason,
    nextBestPath,
    lanes,
    stale: _stale,
    ...rest
  } = board;
  void _adminSummary;
  void _blockers;
  void _staleReason;
  void _stale;

  return {
    ...rest,
    nextBestPath: nextBestPath.map(
      ({ adminOnlyNote: _note, ...step }) => step
    ),
    lanes: lanes
      .filter((lane) => lane.canShareWithClient)
      .map(({ adminOnlyNote: _note, relatedDataRoomItems, ...lane }) => ({
        ...lane,
        relatedDataRoomItems: relatedDataRoomItems.map(
          ({ itemId: _itemId, ...item }) => item
        ),
      })),
  };
}

export function toAdminAdvisorActionBoard(
  board: AdvisorActionBoard | null
): AdvisorActionBoard | null {
  return board;
}

export function toPublicAdvisorActionItem(
  item: AdvisorActionItem
): PublicAdvisorActionItem | null {
  if (!item.client_visible) return null;
  return {
    id: item.id,
    lane_role: item.lane_role,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    owner_role: item.owner_role,
    due_date: item.due_date,
  };
}
