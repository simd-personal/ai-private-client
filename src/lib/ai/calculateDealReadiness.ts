import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import type { DealReadiness } from "@/lib/schemas/ai-strategy-room";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function calculateDealReadiness(
  ctx: PrivateClientIntakeContext
): DealReadiness {
  let objectiveClarity = ctx.objective ? 70 : 30;
  let timelineClarity = ctx.timeline ? 75 : 35;
  let financialContext = ctx.financingContext ? 65 : 40;
  let advisorInvolvement = ctx.advisorsInvolved.length > 0 ? 70 : 45;
  let privacyComplexity = 50;
  let executionComplexity = 50;

  if (ctx.targetMarket) objectiveClarity += 10;
  if (ctx.currentProperty) objectiveClarity += 5;
  if (ctx.needs.length >= 3) executionComplexity += 15;
  if (ctx.ownershipStructure) {
    executionComplexity += 10;
    privacyComplexity += 10;
  }

  if (ctx.privacyLevel?.toLowerCase().includes("high")) {
    privacyComplexity += 20;
    executionComplexity += 10;
  }

  if (ctx.taxReviewNeeded) advisorInvolvement += 5;
  if (ctx.legalReviewNeeded) advisorInvolvement += 5;
  if (ctx.lenderReviewNeeded) advisorInvolvement += 5;
  if (ctx.wealthReviewNeeded) advisorInvolvement += 5;

  if (ctx.contactComplete) {
    objectiveClarity += 5;
    timelineClarity += 5;
  } else {
    objectiveClarity -= 15;
  }

  if (ctx.timeline?.includes("6") || ctx.timeline?.includes("12")) {
    timelineClarity += 10;
  }

  objectiveClarity = clamp(objectiveClarity);
  timelineClarity = clamp(timelineClarity);
  financialContext = clamp(financialContext);
  advisorInvolvement = clamp(advisorInvolvement);
  privacyComplexity = clamp(privacyComplexity);
  executionComplexity = clamp(executionComplexity);

  const readinessScore = clamp(
    objectiveClarity * 0.2 +
      timelineClarity * 0.15 +
      financialContext * 0.15 +
      advisorInvolvement * 0.15 +
      (100 - privacyComplexity) * 0.15 +
      (100 - executionComplexity) * 0.2
  );

  let readinessLabel: DealReadiness["readinessLabel"] = "early_exploration";
  if (readinessScore >= 75) readinessLabel = "execution_ready";
  else if (readinessScore >= 60) readinessLabel = "advisor_review_needed";
  else if (readinessScore >= 45) readinessLabel = "planning_ready";

  const priorityReason =
    readinessScore >= 60
      ? "Objective, timeline, and advisor context are sufficiently defined for coordinated review."
      : "Additional intake clarity is needed before advisor coordination can proceed efficiently.";

  const nextBestAction =
    ctx.advisorsInvolved.length > 0
      ? `Schedule a planning conversation with ${ctx.advisorsInvolved[0]} to confirm sequencing and items to verify.`
      : "Confirm objective, timeline, and advisor roster before scheduling execution conversations.";

  return {
    readinessScore,
    readinessLabel,
    scoreBreakdown: {
      objectiveClarity,
      timelineClarity,
      financialContext,
      advisorInvolvement,
      privacyComplexity,
      executionComplexity,
    },
    priorityReason,
    nextBestAction,
  };
}
