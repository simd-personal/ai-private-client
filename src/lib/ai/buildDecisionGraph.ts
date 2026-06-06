import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import type { AiStrategyRoomOutput } from "@/lib/schemas/ai-strategy-room";
import type { DecisionGraph } from "@/lib/schemas/decision-layer";
import type { DealReadiness } from "@/lib/schemas/ai-strategy-room";

function stageFromReadiness(
  readiness: DealReadiness
): DecisionGraph["decisionStage"] {
  switch (readiness.readinessLabel) {
    case "early_exploration":
      return "exploration";
    case "planning_ready":
      return "planning";
    case "advisor_review_needed":
      return "advisor_review";
    case "execution_ready":
      return "execution_preparation";
    default:
      return "exploration";
  }
}

function advisorLabel(type: string): string {
  const map: Record<string, string> = {
    real_estate_agent: "Licensed Agent",
    wealth_advisor: "Wealth Advisor",
    CPA: "CPA",
    attorney: "Attorney",
    lender_private_banker: "Lender / Private Banker",
    family_office_director: "Family Office Director",
    other: "Advisor",
  };
  return map[type] ?? "Advisor";
}

export function buildDecisionGraph(
  ctx: PrivateClientIntakeContext,
  output: AiStrategyRoomOutput
): DecisionGraph {
  const stage = stageFromReadiness(output.dealReadiness);
  const nodes: DecisionGraph["nodes"] = [];
  const edges: DecisionGraph["edges"] = [];
  let nodeId = 0;
  const addNode = (
    partial: Omit<DecisionGraph["nodes"][number], "id">
  ): string => {
    const id = `n${++nodeId}`;
    nodes.push({ id, ...partial });
    return id;
  };
  const link = (
    from: string,
    to: string,
    label: string,
    dependencyType: DecisionGraph["edges"][number]["dependencyType"]
  ) => {
    edges.push({ from, to, label, dependencyType });
  };

  const centralId = addNode({
    label: "Central decision",
    type: "objective",
    description: ctx.objective,
    status: "needs_review",
    visibility: "public",
    urgency: "high",
  });

  output.strategyRoom.knownFacts.slice(0, 6).forEach((fact) => {
    const id = addNode({
      label: fact.slice(0, 60),
      type: "known_fact",
      description: fact,
      status: "known",
      visibility: "public",
      urgency: "low",
    });
    link(centralId, id, "informed by", "informs");
  });

  output.strategyRoom.itemsToVerify.slice(0, 8).forEach((item) => {
    const id = addNode({
      label: item.slice(0, 60),
      type: "missing_info",
      description: item,
      status: "missing",
      visibility: "public",
      urgency: "medium",
    });
    link(id, centralId, "needed for", "requires");
  });

  output.advisorCoordinationMap.advisors.forEach((advisor) => {
    const id = addNode({
      label: advisor.displayName,
      type: "advisor",
      description: advisor.roleInDecision,
      status: "needs_review",
      visibility: "admin",
      urgency: advisor.urgency,
    });
    link(centralId, id, "reviewed by", "reviewed_by");
  });

  output.redFlagsAndMissingInfo.itemsToClarifyBeforeExecution
    .slice(0, 4)
    .forEach((item) => {
      const id = addNode({
        label: item.slice(0, 60),
        type: "planning_topic",
        description: item,
        status: "needs_review",
        visibility: "public",
        urgency: "medium",
      });
      link(id, centralId, "planning topic", "informs");
    });

  output.meetingPrepPack.documentsToRequest.slice(0, 4).forEach((doc) => {
    const id = addNode({
      label: doc.slice(0, 60),
      type: "document",
      description: doc,
      status: "not_started",
      visibility: "admin",
      urgency: "medium",
    });
    link(id, centralId, "document for", "requires");
  });

  const decisionBlockers = output.redFlagsAndMissingInfo.missingInformation
    .slice(0, 5)
    .map((blocker, i) => ({
      blocker,
      whyItMatters:
        output.redFlagsAndMissingInfo.planningFlags[i] ??
        "May affect advisor coordination timing.",
      advisorOwner:
        output.advisorCoordinationMap.advisors[i]?.displayName ??
        advisorLabel(
          output.advisorCoordinationMap.advisors[0]?.advisorType ?? "other"
        ),
      suggestedNextStep:
        output.dealReadiness.nextBestAction ??
        "Schedule advisor review conversation.",
    }));

  decisionBlockers.forEach((b) => {
    const id = addNode({
      label: b.blocker.slice(0, 60),
      type: "decision_blocker",
      description: b.whyItMatters,
      status: "missing",
      visibility: "admin",
      urgency: "high",
    });
    link(id, centralId, "blocks", "blocks");
  });

  const nextBestPath: DecisionGraph["nextBestPath"] = [
    {
      stepNumber: 1,
      title: "Confirm objective and timeline",
      owner: "Client + Licensed Agent",
      reason: "Aligns the advisory team on scope before deeper review.",
      clientSafeSummary:
        "Confirm your objective and preferred timeline with your advisory team.",
      adminSummary: output.dealReadiness.nextBestAction,
    },
    {
      stepNumber: 2,
      title: "Advisor coordination review",
      owner: output.advisorCoordinationMap.recommendedFirstConversation,
      reason: output.advisorCoordinationMap.coordinationSequence[0] ?? "",
      clientSafeSummary:
        "Coordinate the first advisor conversation identified in your planning brief.",
      adminSummary:
        output.advisorCoordinationMap.coordinationSequence.join(" → "),
    },
    {
      stepNumber: 3,
      title: "Information preparation",
      owner: "Client + advisory team",
      reason: "Items to verify must be resolved before execution preparation.",
      clientSafeSummary:
        "Gather documents and facts your advisors flagged for review.",
      adminSummary: `${output.strategyRoom.itemsToVerify.length} items to verify`,
    },
  ];

  const nextActionId = addNode({
    label: output.dealReadiness.nextBestAction.slice(0, 60),
    type: "next_action",
    description: output.dealReadiness.nextBestAction,
    status: "not_started",
    visibility: "public",
    urgency: "high",
  });
  link(centralId, nextActionId, "next step", "assigned_to");

  return {
    graphTitle: "Private Client Decision Map",
    centralDecision: ctx.objective,
    decisionStage: stage,
    nodes,
    edges,
    decisionBlockers,
    nextBestPath,
    clientSafeSummary: output.strategyRoom.situationSnapshot,
    adminSummary: output.dealReadiness.priorityReason,
  };
}
