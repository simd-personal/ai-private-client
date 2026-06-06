import { z } from "zod";

export const COMPLEXITY_LEVELS = [
  "low",
  "medium",
  "high",
  "very_high",
] as const;

export const ADVISOR_TYPES = [
  "real_estate_agent",
  "wealth_advisor",
  "CPA",
  "attorney",
  "lender_private_banker",
  "family_office_director",
  "other",
] as const;

export const URGENCY_LEVELS = ["low", "medium", "high"] as const;

export const READINESS_LABELS = [
  "early_exploration",
  "planning_ready",
  "advisor_review_needed",
  "execution_ready",
] as const;

export const strategyRoomSchema = z.object({
  situationSnapshot: z.string(),
  knownFacts: z.array(z.string()),
  itemsToVerify: z.array(z.string()),
  keyDecisionDrivers: z.array(z.string()),
  complexityLevel: z.enum(COMPLEXITY_LEVELS),
  primaryCoordinationNeed: z.string(),
});

export const scenarioItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  potentialAdvantages: z.array(z.string()),
  planningRisks: z.array(z.string()),
  advisorReviewsNeeded: z.array(z.string()),
  timingConsiderations: z.array(z.string()),
  liquidityConsiderations: z.array(z.string()),
  privacyConsiderations: z.array(z.string()),
  nonAdviceSummary: z.string(),
});

export const scenarioComparisonSchema = z.object({
  scenarios: z.array(scenarioItemSchema),
  overallScenarioNote: z.string(),
});

export const advisorMapEntrySchema = z.object({
  advisorType: z.enum(ADVISOR_TYPES),
  displayName: z.string(),
  roleInDecision: z.string(),
  topicsToReview: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
  documentsOrInfoNeeded: z.array(z.string()),
  urgency: z.enum(URGENCY_LEVELS),
});

export const advisorCoordinationMapSchema = z.object({
  advisors: z.array(advisorMapEntrySchema),
  coordinationSequence: z.array(z.string()),
  recommendedFirstConversation: z.string(),
});

export const advisorBriefSchema = z.object({
  headline: z.string(),
  contextSummary: z.string(),
  planningTopics: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
  documentsToRequest: z.array(z.string()),
  coordinationNotes: z.string(),
  nonAdviceDisclaimer: z.string(),
});

export const advisorSpecificBriefsSchema = z.object({
  agentBrief: advisorBriefSchema,
  wealthAdvisorBrief: advisorBriefSchema,
  cpaBrief: advisorBriefSchema,
  attorneyBrief: advisorBriefSchema,
  lenderBrief: advisorBriefSchema,
  familyOfficeBrief: advisorBriefSchema,
});

export const dealReadinessSchema = z.object({
  readinessScore: z.number().min(0).max(100),
  readinessLabel: z.enum(READINESS_LABELS),
  scoreBreakdown: z.object({
    objectiveClarity: z.number().min(0).max(100),
    timelineClarity: z.number().min(0).max(100),
    financialContext: z.number().min(0).max(100),
    advisorInvolvement: z.number().min(0).max(100),
    privacyComplexity: z.number().min(0).max(100),
    executionComplexity: z.number().min(0).max(100),
  }),
  priorityReason: z.string(),
  nextBestAction: z.string(),
});

export const relationshipNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
});

export const relationshipEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  relationship: z.string(),
  coordinationNeed: z.string(),
});

export const relationshipIntelligenceMapSchema = z.object({
  nodes: z.array(relationshipNodeSchema),
  edges: z.array(relationshipEdgeSchema),
  summary: z.string(),
});

export const meetingPrepPackSchema = z.object({
  callOpener: z.string(),
  discoveryQuestions: z.array(z.string()),
  likelyObjections: z.array(z.string()),
  suggestedResponses: z.array(z.string()),
  meetingAgenda: z.array(z.string()),
  documentsToRequest: z.array(z.string()),
  recommendedFollowUpTimeline: z.string(),
});

export const whiteGloveFollowUpSchema = z.object({
  smsFollowUp: z.string(),
  emailSubject: z.string(),
  emailBody: z.string(),
  advisorIntroEmail: z.string(),
  internalTeamNote: z.string(),
});

export const redFlagsAndMissingInfoSchema = z.object({
  missingInformation: z.array(z.string()),
  planningFlags: z.array(z.string()),
  complexityFlags: z.array(z.string()),
  riskLanguage: z.object({
    label: z.string(),
    explanation: z.string(),
  }),
  itemsToClarifyBeforeExecution: z.array(z.string()),
});

export const presentationSlideSchema = z.object({
  slideNumber: z.number().int().positive(),
  title: z.string(),
  subtitle: z.string(),
  bullets: z.array(z.string()),
  speakerNote: z.string(),
});

export const presentationModeSchema = z.object({
  slides: z.array(presentationSlideSchema),
});

export const aiStrategyRoomOutputSchema = z.object({
  strategyRoom: strategyRoomSchema,
  scenarioComparison: scenarioComparisonSchema,
  advisorCoordinationMap: advisorCoordinationMapSchema,
  advisorSpecificBriefs: advisorSpecificBriefsSchema,
  dealReadiness: dealReadinessSchema,
  relationshipIntelligenceMap: relationshipIntelligenceMapSchema,
  meetingPrepPack: meetingPrepPackSchema,
  whiteGloveFollowUp: whiteGloveFollowUpSchema,
  redFlagsAndMissingInfo: redFlagsAndMissingInfoSchema,
  presentationMode: presentationModeSchema,
});

export type StrategyRoom = z.infer<typeof strategyRoomSchema>;
export type ScenarioComparison = z.infer<typeof scenarioComparisonSchema>;
export type AdvisorCoordinationMap = z.infer<typeof advisorCoordinationMapSchema>;
export type AdvisorBrief = z.infer<typeof advisorBriefSchema>;
export type AdvisorSpecificBriefs = z.infer<typeof advisorSpecificBriefsSchema>;
export type DealReadiness = z.infer<typeof dealReadinessSchema>;
export type RelationshipIntelligenceMap = z.infer<
  typeof relationshipIntelligenceMapSchema
>;
export type MeetingPrepPack = z.infer<typeof meetingPrepPackSchema>;
export type WhiteGloveFollowUp = z.infer<typeof whiteGloveFollowUpSchema>;
export type RedFlagsAndMissingInfo = z.infer<typeof redFlagsAndMissingInfoSchema>;
export type PresentationMode = z.infer<typeof presentationModeSchema>;
export type AiStrategyRoomOutput = z.infer<typeof aiStrategyRoomOutputSchema>;

export type AdvisorType = (typeof ADVISOR_TYPES)[number];

export interface PublicStrategyRoomData {
  strategyRoom: StrategyRoom | null;
  scenarioComparison: ScenarioComparison | null;
  advisorCoordinationMap: AdvisorCoordinationMap | null;
  relationshipIntelligenceMap: RelationshipIntelligenceMap | null;
  itemsToClarify: RedFlagsAndMissingInfo | null;
}

export interface AdminStrategyRoomData extends PublicStrategyRoomData {
  advisorSpecificBriefs: AdvisorSpecificBriefs | null;
  dealReadiness: DealReadiness | null;
  meetingPrepPack: MeetingPrepPack | null;
  whiteGloveFollowUp: WhiteGloveFollowUp | null;
  presentationMode: PresentationMode | null;
  aiDemoVersion: string | null;
  aiGeneratedAt: string | null;
  aiGenerationSource: string | null;
  aiGenerationModel: string | null;
}

export function parseStrategyRoomField<T>(
  schema: z.ZodType<T>,
  value: unknown
): T | null {
  if (value == null) return null;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toPublicStrategyRoomData(lead: {
  ai_strategy_room?: unknown;
  ai_scenario_comparison?: unknown;
  ai_advisor_coordination_map?: unknown;
  ai_relationship_map?: unknown;
  ai_red_flags_missing_info?: unknown;
}): PublicStrategyRoomData {
  return {
    strategyRoom: parseStrategyRoomField(
      strategyRoomSchema,
      lead.ai_strategy_room
    ),
    scenarioComparison: parseStrategyRoomField(
      scenarioComparisonSchema,
      lead.ai_scenario_comparison
    ),
    advisorCoordinationMap: parseStrategyRoomField(
      advisorCoordinationMapSchema,
      lead.ai_advisor_coordination_map
    ),
    relationshipIntelligenceMap: parseStrategyRoomField(
      relationshipIntelligenceMapSchema,
      lead.ai_relationship_map
    ),
    itemsToClarify: parseStrategyRoomField(
      redFlagsAndMissingInfoSchema,
      lead.ai_red_flags_missing_info
    ),
  };
}

export function toAdminStrategyRoomData(lead: {
  ai_strategy_room?: unknown;
  ai_scenario_comparison?: unknown;
  ai_advisor_coordination_map?: unknown;
  ai_advisor_specific_briefs?: unknown;
  ai_deal_readiness?: unknown;
  ai_relationship_map?: unknown;
  ai_meeting_prep_pack?: unknown;
  ai_white_glove_follow_up?: unknown;
  ai_red_flags_missing_info?: unknown;
  ai_presentation_mode?: unknown;
  ai_demo_version?: string | null;
  ai_generated_at?: string | null;
  ai_generation_source?: string | null;
  ai_generation_model?: string | null;
}): AdminStrategyRoomData {
  return {
    ...toPublicStrategyRoomData(lead),
    advisorSpecificBriefs: parseStrategyRoomField(
      advisorSpecificBriefsSchema,
      lead.ai_advisor_specific_briefs
    ),
    dealReadiness: parseStrategyRoomField(
      dealReadinessSchema,
      lead.ai_deal_readiness
    ),
    meetingPrepPack: parseStrategyRoomField(
      meetingPrepPackSchema,
      lead.ai_meeting_prep_pack
    ),
    whiteGloveFollowUp: parseStrategyRoomField(
      whiteGloveFollowUpSchema,
      lead.ai_white_glove_follow_up
    ),
    presentationMode: parseStrategyRoomField(
      presentationModeSchema,
      lead.ai_presentation_mode
    ),
    aiDemoVersion: lead.ai_demo_version ?? null,
    aiGeneratedAt: lead.ai_generated_at ?? null,
    aiGenerationSource: lead.ai_generation_source ?? null,
    aiGenerationModel: lead.ai_generation_model ?? null,
  };
}

export function getAdvisorBriefByType(
  briefs: AdvisorSpecificBriefs,
  advisorType: AdvisorType
): AdvisorBrief {
  switch (advisorType) {
    case "real_estate_agent":
      return briefs.agentBrief;
    case "wealth_advisor":
      return briefs.wealthAdvisorBrief;
    case "CPA":
      return briefs.cpaBrief;
    case "attorney":
      return briefs.attorneyBrief;
    case "lender_private_banker":
      return briefs.lenderBrief;
    case "family_office_director":
      return briefs.familyOfficeBrief;
    default:
      return briefs.agentBrief;
  }
}

export const ADVISOR_TYPE_LABELS: Record<AdvisorType, string> = {
  real_estate_agent: "Licensed Agent",
  wealth_advisor: "Wealth Advisor",
  CPA: "CPA",
  attorney: "Attorney",
  lender_private_banker: "Lender / Private Banker",
  family_office_director: "Family Office Director",
  other: "Advisor",
};

export const READINESS_LABEL_DISPLAY: Record<
  DealReadiness["readinessLabel"],
  string
> = {
  early_exploration: "Early Exploration",
  planning_ready: "Planning Ready",
  advisor_review_needed: "Advisor Review Needed",
  execution_ready: "Execution Ready",
};
