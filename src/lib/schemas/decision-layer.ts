import { z } from "zod";

export const DECISION_STAGES = [
  "exploration",
  "planning",
  "advisor_review",
  "execution_preparation",
] as const;

export const DECISION_NODE_TYPES = [
  "objective",
  "known_fact",
  "missing_info",
  "advisor",
  "document",
  "planning_topic",
  "decision_blocker",
  "next_action",
] as const;

export const DECISION_NODE_STATUSES = [
  "known",
  "missing",
  "needs_review",
  "complete",
  "not_started",
] as const;

export const DECISION_VISIBILITY = ["public", "admin"] as const;

export const DEPENDENCY_TYPES = [
  "requires",
  "informs",
  "blocks",
  "reviewed_by",
  "assigned_to",
] as const;

export const decisionGraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(DECISION_NODE_TYPES),
  description: z.string(),
  status: z.enum(DECISION_NODE_STATUSES),
  visibility: z.enum(DECISION_VISIBILITY),
  urgency: z.enum(["low", "medium", "high"]),
});

export const decisionGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
  dependencyType: z.enum(DEPENDENCY_TYPES),
});

export const decisionBlockerSchema = z.object({
  blocker: z.string(),
  whyItMatters: z.string(),
  advisorOwner: z.string(),
  suggestedNextStep: z.string(),
});

export const nextBestPathStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string(),
  owner: z.string(),
  reason: z.string(),
  clientSafeSummary: z.string(),
  adminSummary: z.string(),
});

export const decisionGraphSchema = z.object({
  graphTitle: z.string(),
  centralDecision: z.string(),
  decisionStage: z.enum(DECISION_STAGES),
  nodes: z.array(decisionGraphNodeSchema),
  edges: z.array(decisionGraphEdgeSchema),
  decisionBlockers: z.array(decisionBlockerSchema),
  nextBestPath: z.array(nextBestPathStepSchema),
  clientSafeSummary: z.string(),
  adminSummary: z.string(),
});

export const complianceCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["passed", "needs_review", "blocked"]),
  explanation: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

export const blockedPhraseSchema = z.object({
  phrase: z.string(),
  category: z.string(),
  replacementSuggestion: z.string(),
});

export const safeLanguageSchema = z.object({
  category: z.string(),
  phrase: z.string(),
});

export const complianceGuardrailsSchema = z.object({
  overallStatus: z.enum(["passed", "needs_review", "blocked"]),
  checkedAt: z.string(),
  checks: z.array(complianceCheckSchema),
  publicDisclosure: z.object({
    briefDisclaimer: z.string(),
    advisorReviewDisclosure: z.string(),
  }),
  blockedPhrasesFound: z.array(blockedPhraseSchema),
  safeLanguageInserted: z.array(safeLanguageSchema),
  adminNotes: z.array(z.string()),
});

export const dataRoomSuggestionSchema = z.object({
  category: z.string(),
  itemName: z.string(),
  description: z.string(),
  requestedFrom: z.string(),
  advisorOwner: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  visibility: z.enum(DECISION_VISIBILITY),
  aiReason: z.string(),
});

export const dataRoomSuggestionsSchema = z.object({
  items: z.array(dataRoomSuggestionSchema),
  generatedAt: z.string(),
});

export const decisionTimelineSummarySchema = z.object({
  latestVersion: z.number(),
  headline: z.string(),
  currentStage: z.enum(DECISION_STAGES),
  recentChanges: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export const DATA_ROOM_STATUSES = [
  "not_requested",
  "requested",
  "received",
  "reviewed",
  "not_needed",
] as const;

export const documentSummarySchema = z.object({
  summaryTitle: z.string(),
  documentTypeGuess: z.string(),
  extractedFactsForReview: z.array(z.string()),
  possiblePlanningTopics: z.array(z.string()),
  advisorReviewNeeded: z.array(z.string()),
  missingOrUnclearItems: z.array(z.string()),
  cautionNote: z.string(),
});

export type DocumentSummary = z.infer<typeof documentSummarySchema>;

export const dataRoomItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  lead_id: z.string().uuid(),
  category: z.string(),
  item_name: z.string(),
  description: z.string().nullable(),
  requested_from: z.string().nullable(),
  advisor_owner: z.string().nullable(),
  status: z.enum(DATA_ROOM_STATUSES),
  priority: z.enum(["low", "medium", "high"]),
  visibility: z.enum(DECISION_VISIBILITY),
  due_date: z.string().nullable(),
  storage_path: z.string().nullable(),
  file_name: z.string().nullable(),
  file_mime_type: z.string().nullable(),
  file_size_bytes: z.number().nullable(),
  ai_reason: z.string().nullable(),
  ai_document_summary: documentSummarySchema.nullable().optional(),
  ai_document_summary_generated_at: z.string().nullable().optional(),
  ai_document_summary_source: z.string().nullable().optional(),
  ai_document_summary_model: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DataRoomItem = z.infer<typeof dataRoomItemSchema>;

export type PublicDataRoomItem = Omit<
  DataRoomItem,
  | "storage_path"
  | "file_name"
  | "file_mime_type"
  | "file_size_bytes"
  | "ai_document_summary"
  | "ai_document_summary_generated_at"
  | "ai_document_summary_source"
  | "ai_document_summary_model"
>;

export function toPublicDataRoomItem(item: DataRoomItem): PublicDataRoomItem {
  const {
    storage_path: _sp,
    file_name: _fn,
    file_mime_type: _mt,
    file_size_bytes: _fs,
    ai_document_summary: _ads,
    ai_document_summary_generated_at: _adsg,
    ai_document_summary_source: _adss,
    ai_document_summary_model: _adsm,
    ...rest
  } = item;
  void _sp;
  void _fn;
  void _mt;
  void _fs;
  void _ads;
  void _adsg;
  void _adss;
  void _adsm;
  return rest;
}

export const meetingSummarySchema = z.object({
  summary: z.string(),
  decisionsMade: z.array(z.string()),
  newFacts: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  advisorFollowUps: z.array(z.string()),
  suggestedClientFollowUp: z.string(),
  dataRoomUpdates: z.array(z.string()),
  decisionGraphUpdates: z.array(z.string()),
});

export const meetingNoteSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  lead_id: z.string().uuid(),
  note_title: z.string().nullable(),
  note_body: z.string(),
  meeting_date: z.string().nullable(),
  attendees: z.array(z.string()),
  ai_summary: meetingSummarySchema.nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const decisionVersionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  lead_id: z.string().uuid(),
  version_number: z.number().int(),
  change_source: z.string(),
  changed_by: z.string().nullable(),
  previous_snapshot: z.unknown().nullable(),
  new_snapshot: z.unknown().nullable(),
  ai_change_summary: z
    .object({
      changedFields: z.array(z.string()),
      summary: z.string(),
      implications: z.array(z.string()),
      newNextSteps: z.array(z.string()),
    })
    .nullable(),
  created_at: z.string(),
});

export type DecisionGraph = z.infer<typeof decisionGraphSchema>;
export type NextBestPathStep = z.infer<typeof nextBestPathStepSchema>;
export type PublicNextBestPathStep = Omit<NextBestPathStep, "adminSummary">;
export type PublicDecisionGraph = Omit<
  DecisionGraph,
  "decisionBlockers" | "adminSummary" | "nextBestPath"
> & {
  nextBestPath: PublicNextBestPathStep[];
};
export type ComplianceGuardrails = z.infer<typeof complianceGuardrailsSchema>;
export type DataRoomSuggestions = z.infer<typeof dataRoomSuggestionsSchema>;
export type MeetingSummary = z.infer<typeof meetingSummarySchema>;
export type MeetingNote = z.infer<typeof meetingNoteSchema>;
export type DecisionVersion = z.infer<typeof decisionVersionSchema>;
export type DecisionTimelineSummary = z.infer<
  typeof decisionTimelineSummarySchema
>;

export function parseDecisionField<T>(
  schema: z.ZodType<T>,
  value: unknown
): T | null {
  if (value == null) return null;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toPublicDecisionGraph(
  graph: DecisionGraph | null
): PublicDecisionGraph | null {
  if (!graph) return null;
  const publicNodes = graph.nodes.filter((n) => n.visibility === "public");
  const publicNodeIds = new Set(publicNodes.map((n) => n.id));
  const {
    decisionBlockers: _blockers,
    adminSummary: _adminSummary,
    nextBestPath,
    ...rest
  } = graph;
  void _blockers;
  void _adminSummary;

  return {
    ...rest,
    nodes: publicNodes,
    edges: graph.edges.filter(
      (e) => publicNodeIds.has(e.from) && publicNodeIds.has(e.to)
    ),
    nextBestPath: nextBestPath.map(({ adminSummary: _stepAdmin, ...step }) => step),
  };
}

export interface PublicDecisionLayerData {
  decisionGraph: PublicDecisionGraph | null;
  dataRoomItems: PublicDataRoomItem[];
}

export interface AdminDecisionLayerData extends Omit<
  PublicDecisionLayerData,
  "decisionGraph" | "dataRoomItems"
> {
  decisionGraph: DecisionGraph | null;
  dataRoomItems: DataRoomItem[];
  complianceGuardrails: ComplianceGuardrails | null;
  decisionTimelineSummary: DecisionTimelineSummary | null;
  dataRoomSuggestions: DataRoomSuggestions | null;
  decisionStage: string | null;
}

export function toPublicDecisionLayerData(lead: {
  ai_decision_graph?: unknown;
}, dataRoomItems: DataRoomItem[] = []): PublicDecisionLayerData {
  const graph = parseDecisionField(decisionGraphSchema, lead.ai_decision_graph);
  return {
    decisionGraph: toPublicDecisionGraph(graph),
    dataRoomItems: dataRoomItems
      .filter((i) => i.visibility === "public")
      .map(toPublicDataRoomItem),
  };
}

export function toAdminDecisionLayerData(
  lead: {
    ai_decision_graph?: unknown;
    ai_compliance_guardrails?: unknown;
    ai_decision_timeline_summary?: unknown;
    ai_data_room_suggestions?: unknown;
    decision_stage?: string | null;
  },
  dataRoomItems: DataRoomItem[] = []
): AdminDecisionLayerData {
  return {
    decisionGraph: parseDecisionField(decisionGraphSchema, lead.ai_decision_graph),
    complianceGuardrails: parseDecisionField(
      complianceGuardrailsSchema,
      lead.ai_compliance_guardrails
    ),
    decisionTimelineSummary: parseDecisionField(
      decisionTimelineSummarySchema,
      lead.ai_decision_timeline_summary
    ),
    dataRoomSuggestions: parseDecisionField(
      dataRoomSuggestionsSchema,
      lead.ai_data_room_suggestions
    ),
    decisionStage: lead.decision_stage ?? null,
    dataRoomItems,
  };
}

export const DATA_ROOM_CATEGORIES = [
  "Property Documents",
  "Tax / CPA Review",
  "Legal / Entity Review",
  "Lending / Private Banking Review",
  "Wealth Advisor Review",
  "Insurance / Risk Review",
  "Privacy / Execution",
  "Family Office / Governance",
] as const;
