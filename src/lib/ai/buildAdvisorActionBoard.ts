import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import type { AiStrategyRoomOutput } from "@/lib/schemas/ai-strategy-room";
import type {
  AdvisorActionBoard,
  AdvisorActionLane,
  AdvisorDecisionBlocker,
  AdvisorNextBestPathStep,
  AdvisorRole,
  LaneStatus,
  LaneUrgency,
  RelatedDataRoomItem,
} from "@/lib/schemas/advisor-action-board";
import { getAdvisorRoleLabel } from "@/lib/schemas/advisor-action-board";
import type { DataRoomItem, DecisionGraph } from "@/lib/schemas/decision-layer";
import type { MeetingNote } from "@/lib/schemas/decision-layer";

export interface BuildAdvisorActionBoardInput {
  ctx: PrivateClientIntakeContext;
  output: AiStrategyRoomOutput;
  decisionGraph: DecisionGraph;
  dataRoomItems: DataRoomItem[];
  meetingNotes?: MeetingNote[];
  isMercerDemo?: boolean;
}

const ROLE_CATEGORY_MAP: Record<AdvisorRole, string[]> = {
  cpa: ["Tax / CPA Review"],
  attorney: ["Legal / Entity Review", "Privacy / Execution"],
  lender_private_banker: ["Lending / Private Banking Review"],
  wealth_advisor: ["Wealth Advisor Review"],
  real_estate_agent: ["Property Documents", "Privacy / Execution"],
  insurance_risk_advisor: ["Insurance / Risk Review"],
  family_office_director: ["Family Office / Governance"],
  other: [],
};

function mapStrategyAdvisorType(type: string): AdvisorRole {
  const map: Record<string, AdvisorRole> = {
    real_estate_agent: "real_estate_agent",
    wealth_advisor: "wealth_advisor",
    CPA: "cpa",
    attorney: "attorney",
    lender_private_banker: "lender_private_banker",
    family_office_director: "family_office_director",
    other: "other",
  };
  return map[type] ?? "other";
}

function parseTimelineMonths(timeline?: string): number | null {
  if (!timeline) return null;
  const lower = timeline.toLowerCase();
  if (lower.includes("0-3") || lower.includes("0 to 3") || lower.includes("immediate")) {
    return 2;
  }
  if (lower.includes("3-6") || lower.includes("3 to 6")) return 4;
  if (lower.includes("6-12") || lower.includes("6 to 12") || lower.includes("6–12")) {
    return 9;
  }
  if (lower.includes("12+") || lower.includes("over 12")) return 18;
  const match = lower.match(/(\d+)\s*(?:to|–|-)\s*(\d+)/);
  if (match) {
    return (Number(match[1]) + Number(match[2])) / 2;
  }
  const single = lower.match(/(\d+)\s*month/);
  if (single) return Number(single[1]);
  return null;
}

function computeOverallUrgency(
  ctx: PrivateClientIntakeContext,
  decisionGraph: DecisionGraph
): LaneUrgency {
  const months = parseTimelineMonths(ctx.timeline);
  const privacyHigh =
    ctx.privacyLevel?.toLowerCase().includes("high") ?? false;
  const hasBlockers = decisionGraph.decisionBlockers.length > 0;

  if (
    (months != null && months <= 3) ||
    privacyHigh ||
    ctx.taxReviewNeeded ||
    ctx.legalReviewNeeded ||
    ctx.lenderReviewNeeded ||
    Boolean(ctx.ownershipStructure?.toLowerCase().includes("trust")) ||
    hasBlockers
  ) {
    return "high";
  }
  if (
    (months != null && months <= 12) ||
    ctx.advisorsInvolved.length >= 2
  ) {
    return "medium";
  }
  return "low";
}

function shouldIncludeRole(
  role: AdvisorRole,
  ctx: PrivateClientIntakeContext,
  output: AiStrategyRoomOutput,
  isMercerDemo?: boolean
): boolean {
  const text = [
    ctx.objective,
    ctx.financingContext,
    ctx.freeText,
    ctx.ownershipStructure,
    ...ctx.needs,
    ...ctx.advisorsInvolved,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  switch (role) {
    case "real_estate_agent":
      return true;
    case "wealth_advisor":
      return (
        isMercerDemo ||
        ctx.wealthReviewNeeded ||
        ctx.advisorsInvolved.some((a) => /wealth/i.test(a)) ||
        /liquidity|portfolio|wealth|financial/i.test(text)
      );
    case "cpa":
      return (
        ctx.taxReviewNeeded ||
        /1031|capital gain|tax|cpa|investment property|sale/i.test(text)
      );
    case "attorney":
      return (
        ctx.legalReviewNeeded ||
        /trust|llc|entity|estate|attorney|privacy-first|privacy first/i.test(
          text
        )
      );
    case "lender_private_banker":
      return (
        ctx.lenderReviewNeeded ||
        /financ|ltv|loan|bridge|partial financ|lender|bank/i.test(text)
      );
    case "family_office_director":
      return (
        /family office|uhn|multi-generational|multiple advisor/i.test(text) ||
        (ctx.privacyLevel?.toLowerCase().includes("high") ?? false) ||
        ctx.advisorsInvolved.length >= 3
      );
    case "insurance_risk_advisor":
      return (
        /waterfront|wildfire|coastal|mountain|second home|high-value|insurance/i.test(
          text
        ) ||
        (ctx.currentProperty?.toLowerCase().includes("aspen") ?? false) ||
        (ctx.targetMarket?.toLowerCase().includes("waterfront") ?? false)
      );
    default:
      return false;
  }
}

function relatedItemsForRole(
  role: AdvisorRole,
  dataRoomItems: DataRoomItem[]
): RelatedDataRoomItem[] {
  const categories = ROLE_CATEGORY_MAP[role];
  return dataRoomItems
    .filter((item) => categories.some((cat) => item.category === cat))
    .map((item) => ({
      itemId: item.id,
      category: item.category,
      itemName: item.item_name,
      status: item.status,
      priority: item.priority,
    }));
}

function computeLaneStatus(
  role: AdvisorRole,
  relatedItems: RelatedDataRoomItem[],
  meetingNotes: MeetingNote[],
  output: AiStrategyRoomOutput
): LaneStatus {
  const criticalMissing = relatedItems.some(
    (item) =>
      item.priority === "high" &&
      !["reviewed", "not_needed", "received"].includes(item.status)
  );
  if (criticalMissing) return "waiting_on_document";

  const advisorEntry = output.advisorCoordinationMap.advisors.find(
    (a) => mapStrategyAdvisorType(a.advisorType) === role
  );
  if (advisorEntry && advisorEntry.urgency === "high") return "needs_review";

  const reviewedCount = relatedItems.filter(
    (item) => item.status === "reviewed" || item.status === "not_needed"
  ).length;
  if (relatedItems.length > 0 && reviewedCount === relatedItems.length) {
    return "complete";
  }
  if (reviewedCount > 0) return "in_progress";

  const hasMeetingNote = meetingNotes.length > 0;
  const hasEnoughFacts = output.strategyRoom.knownFacts.length >= 2;
  if (hasEnoughFacts && !hasMeetingNote) return "ready_for_meeting";

  return "not_started";
}

function findAdvisorEntry(
  role: AdvisorRole,
  output: AiStrategyRoomOutput
) {
  return output.advisorCoordinationMap.advisors.find(
    (a) => mapStrategyAdvisorType(a.advisorType) === role
  );
}

function buildLane(
  role: AdvisorRole,
  input: BuildAdvisorActionBoardInput,
  overallUrgency: LaneUrgency
): AdvisorActionLane {
  const { ctx, output, dataRoomItems, meetingNotes = [] } = input;
  const advisorEntry = findAdvisorEntry(role, output);
  const relatedItems = relatedItemsForRole(role, dataRoomItems);
  const status = computeLaneStatus(role, relatedItems, meetingNotes, output);
  const displayName = getAdvisorRoleLabel(role);
  const missingFromItems = relatedItems
    .filter((item) => !["reviewed", "not_needed", "received"].includes(item.status))
    .map((item) => `${item.itemName} (${item.status.replace(/_/g, " ")})`);

  const missingFromStrategy =
    advisorEntry?.documentsOrInfoNeeded.filter(
      (doc) => !relatedItems.some((item) => item.itemName.includes(doc.slice(0, 20)))
    ) ?? [];

  const missingInformation = [
    ...missingFromItems,
    ...missingFromStrategy.slice(0, 3),
    ...output.strategyRoom.itemsToVerify.slice(0, 2),
  ].slice(0, 5);

  const laneUrgency: LaneUrgency =
    advisorEntry?.urgency === "high" || status === "waiting_on_document"
      ? "high"
      : advisorEntry?.urgency === "medium"
        ? "medium"
        : overallUrgency;

  const questionsToAsk =
    advisorEntry?.questionsToAsk.slice(0, 4) ??
    [`What planning topics should ${displayName} review first?`];

  const nextAction =
    status === "waiting_on_document"
      ? `Request missing documents for ${displayName} review.`
      : status === "needs_review"
        ? `Schedule ${displayName} review conversation.`
        : status === "ready_for_meeting"
          ? `Prepare client-safe summary for ${displayName} meeting.`
          : advisorEntry?.roleInDecision
            ? `Coordinate ${displayName}: ${advisorEntry.roleInDecision.slice(0, 80)}`
            : `Confirm ${displayName} coordination need.`;

  const canShare =
    role === "real_estate_agent" ||
    status === "ready_for_meeting" ||
    status === "complete" ||
    (relatedItems.some((item) => item.status !== "not_requested") &&
      !missingInformation.some((m) => /basis|trust|entity|mortgage/i.test(m)));

  return {
    id: `lane-${role}`,
    advisorRole: role,
    displayName,
    status,
    urgency: laneUrgency,
    laneSummary:
      advisorEntry?.roleInDecision ??
      `${displayName} coordination for planning and advisor review.`,
    whyThisAdvisorMatters:
      advisorEntry?.topicsToReview[0] ??
      `This advisor helps verify planning topics before the next client meeting.`,
    nextAction,
    questionsToAsk,
    missingInformation,
    relatedDataRoomItems: relatedItems,
    decisionDependencies: output.advisorCoordinationMap.coordinationSequence
      .filter((step) => step.toLowerCase().includes(displayName.split(" ")[0].toLowerCase()))
      .slice(0, 3),
    clientSafeSummary: `${displayName} review may help confirm planning topics and items to verify before your next meeting.`,
    adminOnlyNote: `Internal lane for ${displayName}. Status: ${status}. Missing: ${missingInformation.length} items.`,
    suggestedOwnerName: advisorEntry?.displayName,
    targetTiming: ctx.timeline ?? "To be confirmed with client",
    canShareWithClient: canShare,
  };
}

function buildBlockers(
  input: BuildAdvisorActionBoardInput,
  lanes: AdvisorActionLane[]
): AdvisorDecisionBlocker[] {
  const { ctx, decisionGraph, dataRoomItems } = input;
  const blockers: AdvisorDecisionBlocker[] = [];
  let blockerId = 0;

  const addBlocker = (
    partial: Omit<AdvisorDecisionBlocker, "id">
  ) => {
    blockers.push({ id: `blocker-${++blockerId}`, ...partial });
  };

  dataRoomItems
    .filter(
      (item) =>
        item.priority === "high" &&
        !["reviewed", "not_needed", "received"].includes(item.status)
    )
    .slice(0, 3)
    .forEach((item) => {
      const ownerRole =
        lanes.find((lane) =>
          lane.relatedDataRoomItems.some((r) => r.itemId === item.id)
        )?.advisorRole ?? "real_estate_agent";
      addBlocker({
        blocker: `Missing: ${item.item_name}`,
        blockedArea: item.category,
        ownerRole,
        severity: "high",
        whyItMatters:
          item.ai_reason ??
          "May delay advisor review until document or information is provided.",
        suggestedResolution: `Request ${item.item_name} from client for advisor review.`,
        clientSafeLanguage: `An item to verify: ${item.item_name} may be needed for advisor review.`,
        adminOnlyNote: `Data room item ${item.id} — status ${item.status}.`,
      });
    });

  decisionGraph.decisionBlockers.slice(0, 3).forEach((b) => {
    addBlocker({
      blocker: b.blocker,
      blockedArea: "Decision coordination",
      ownerRole: "real_estate_agent",
      severity: "medium",
      whyItMatters: b.whyItMatters,
      suggestedResolution: b.suggestedNextStep,
      clientSafeLanguage: `Planning topic to verify: ${b.blocker.slice(0, 80)}`,
      adminOnlyNote: `From decision graph blocker — owner ${b.advisorOwner}.`,
    });
  });

  if (!ctx.ownershipStructure && ctx.legalReviewNeeded) {
    addBlocker({
      blocker: "Ownership structure not confirmed",
      blockedArea: "Legal / Entity Review",
      ownerRole: "attorney",
      severity: "high",
      whyItMatters: "Attorney review may require entity context before execution planning.",
      suggestedResolution: "Confirm trust or entity ownership with client and attorney.",
      clientSafeLanguage: "Ownership structure is an item to verify with your attorney.",
      adminOnlyNote: "Missing ownership structure in intake.",
    });
  }

  if (ctx.taxReviewNeeded && !dataRoomItems.some((i) => /basis/i.test(i.item_name))) {
    addBlocker({
      blocker: "Estimated basis not provided",
      blockedArea: "Tax / CPA Review",
      ownerRole: "cpa",
      severity: "medium",
      whyItMatters: "CPA may need basis context for planning topic discussion.",
      suggestedResolution: "Request estimated cost basis from client for CPA review.",
      clientSafeLanguage: "Cost basis may be an item to verify with your CPA.",
      adminOnlyNote: "No basis estimate in data room.",
    });
  }

  if (ctx.lenderReviewNeeded && !ctx.financingContext) {
    addBlocker({
      blocker: "Financing approach unclear",
      blockedArea: "Lending / Private Banking Review",
      ownerRole: "lender_private_banker",
      severity: "medium",
      whyItMatters: "Lender review may be delayed without financing context.",
      suggestedResolution: "Confirm partial or full financing preference with client.",
      clientSafeLanguage: "Financing preferences are an item to verify with your lender.",
      adminOnlyNote: "Missing financing clarity.",
    });
  }

  if (ctx.privacyLevel?.toLowerCase().includes("high")) {
    addBlocker({
      blocker: "Privacy protocol not documented",
      blockedArea: "Privacy / Execution",
      ownerRole: "real_estate_agent",
      severity: "medium",
      whyItMatters: "Privacy-first execution may require agreed showing and marketing protocol.",
      suggestedResolution: "Document privacy preferences with licensed agent review.",
      clientSafeLanguage: "Privacy preferences should be confirmed before listing activity.",
      adminOnlyNote: "High privacy level flagged in intake.",
    });
  }

  if (!ctx.timeline) {
    addBlocker({
      blocker: "Timeline not confirmed",
      blockedArea: "Planning coordination",
      ownerRole: "wealth_advisor",
      severity: "low",
      whyItMatters: "Advisor sequencing depends on client timeline clarity.",
      suggestedResolution: "Confirm preferred timeline in next client meeting.",
      clientSafeLanguage: "Timeline preferences help coordinate advisor review.",
      adminOnlyNote: "Missing timeline in intake.",
    });
  }

  return blockers.slice(0, 8);
}

function buildNextBestPath(
  lanes: AdvisorActionLane[],
  ctx: PrivateClientIntakeContext
): AdvisorNextBestPathStep[] {
  const sorted = [...lanes].sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  const steps: AdvisorNextBestPathStep[] = sorted.slice(0, 6).map((lane, index) => ({
    stepNumber: index + 1,
    title: lane.nextAction,
    ownerRole: lane.advisorRole,
    reason: lane.whyThisAdvisorMatters,
    clientSafeLanguage: lane.clientSafeSummary,
    adminOnlyNote: `Lane ${lane.id} — urgency ${lane.urgency}, status ${lane.status}.`,
  }));

  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      title: "Confirm objective and timeline",
      ownerRole: "real_estate_agent",
      reason: "Aligns advisory team before deeper review.",
      clientSafeLanguage:
        "Confirm your objective and timeline with your advisory team.",
      adminOnlyNote: "Fallback step — no lanes generated.",
    });
  }

  if (ctx.timeline && steps.length < 3) {
    steps.push({
      stepNumber: steps.length + 1,
      title: "Prepare for next client meeting",
      ownerRole: "real_estate_agent",
      reason: "Consolidate items to verify before client conversation.",
      clientSafeLanguage:
        "Review open planning topics before your next advisor meeting.",
      adminOnlyNote: "Meeting prep coordination step.",
    });
  }

  return steps.slice(0, 6);
}

export function buildAdvisorActionBoard(
  input: BuildAdvisorActionBoardInput
): AdvisorActionBoard {
  const { ctx, output, decisionGraph, isMercerDemo } = input;
  const overallUrgency = computeOverallUrgency(ctx, decisionGraph);

  const roles: AdvisorRole[] = [
    "wealth_advisor",
    "cpa",
    "attorney",
    "lender_private_banker",
    "real_estate_agent",
    "family_office_director",
    "insurance_risk_advisor",
  ];

  const activeRoles = roles.filter((role) =>
    shouldIncludeRole(role, ctx, output, isMercerDemo)
  );
  if (!activeRoles.includes("real_estate_agent")) {
    activeRoles.push("real_estate_agent");
  }

  const lanes = activeRoles.map((role) =>
    buildLane(role, input, overallUrgency)
  );
  const blockers = buildBlockers(input, lanes);
  const nextBestPath = buildNextBestPath(lanes, ctx);

  const clientSafeSummary =
    `Advisor review plan: ${lanes.filter((l) => l.canShareWithClient).length} coordination areas may benefit from advisor review before your next meeting. ` +
    output.strategyRoom.primaryCoordinationNeed;

  return {
    boardTitle: "Advisor Action Intelligence Board",
    caseSummary: output.strategyRoom.situationSnapshot,
    primaryCoordinationNeed: output.strategyRoom.primaryCoordinationNeed,
    overallStage: decisionGraph.decisionStage,
    nextBestPath,
    lanes,
    blockers,
    clientSafeSummary,
    adminSummary: `Generated ${lanes.length} lanes, ${blockers.length} blockers. Readiness: ${output.dealReadiness.readinessLabel}. Next: ${output.dealReadiness.nextBestAction}`,
    generatedAt: new Date().toISOString(),
    source: "deterministic",
    model: "advisor-action-board-v1",
    stale: false,
  };
}
