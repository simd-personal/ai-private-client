import { buildIntakeContext, type LeadType } from "@/lib/ai/intake-context";
import { sanitizePublicDecisionText } from "@/lib/decision/decision-map-utils";
import type { FastPublicBrief } from "@/lib/schemas/fast-public-brief";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import type { TenantConfig } from "@/lib/tenants/tenant-config";

type QuizData =
  | BuyerQuizData
  | SellerQuizData
  | EquityQuizData
  | WealthQuizData;

function redactNames(text: string, firstName: string, lastName: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return sanitizePublicDecisionText(text, [firstName, lastName, full].filter(Boolean));
}

export function buildFastPublicBrief(input: {
  leadType: LeadType;
  quizData: QuizData;
  tenant: TenantConfig;
  firstName: string;
  lastName: string;
}): FastPublicBrief {
  const { leadType, quizData, firstName, lastName } = input;
  const ctx = buildIntakeContext(leadType, quizData);

  const knownFacts: string[] = [];
  if (ctx.objective) knownFacts.push(`Objective: ${ctx.objective}`);
  if (ctx.targetMarket) knownFacts.push(`Target market: ${ctx.targetMarket}`);
  if (ctx.timeline) knownFacts.push(`Timeline: ${ctx.timeline}`);
  if (ctx.financingContext) {
    knownFacts.push(`Financing context: ${ctx.financingContext}`);
  }
  if (ctx.currentProperty) {
    knownFacts.push(`Current property context: ${ctx.currentProperty}`);
  }
  if (ctx.ownershipStructure) {
    knownFacts.push(`Ownership structure: ${ctx.ownershipStructure}`);
  }
  if (ctx.privacyLevel) {
    knownFacts.push(`Privacy preferences: ${ctx.privacyLevel}`);
  }

  const itemsToClarify: string[] = [
    "Proof of funds or financing workflow",
    "Ownership or entity structure",
    "Budget assumptions and planning constraints",
    "Property criteria and intended use",
    "Privacy and communication preferences",
  ];

  if (leadType === "buyer") {
    const q = quizData as BuyerQuizData;
    itemsToClarify.push(
      `Property type confirmation: ${q.propertyType.replace(/_/g, " ")}`
    );
  }
  if (leadType === "equity") {
    itemsToClarify.push("Timing for current property transition");
    itemsToClarify.push("Equity deployment and liquidity planning assumptions");
  }
  if (leadType === "seller") {
    itemsToClarify.push("Listing timing and showing privacy preferences");
  }

  const advisorReviewTopics: string[] = [
    "Licensed agent review",
    "Wealth advisor review",
    "CPA review",
    "Attorney review",
  ];
  if (ctx.lenderReviewNeeded) {
    advisorReviewTopics.push("Lender / private banker review");
  }
  for (const need of ctx.needs) {
    if (!advisorReviewTopics.some((t) => t.toLowerCase().includes(need.toLowerCase()))) {
      advisorReviewTopics.push(need);
    }
  }

  const timelinePhrase = ctx.timeline
    ? ` within ${ctx.timeline.replace(/_/g, " ")}`
    : "";

  const executiveSummary = redactNames(
    `The client is exploring ${ctx.objective.toLowerCase()}${timelinePhrase}. Based on the information provided, the next step is to confirm funding workflow, ownership structure, and advisor review needs before moving into execution planning.`,
    firstName,
    lastName
  );

  const recommendedNextStep = redactNames(
    ctx.objective
      ? `Confirm the objective (${ctx.objective}), validate budget and funding workflow, and schedule an advisor review to align specialists before execution planning.`
      : "Confirm objectives, funding workflow, and advisor review needs with your advisory team.",
    firstName,
    lastName
  );

  const reportTitle =
    leadType === "buyer"
      ? "Initial Private Buyer Brief"
      : leadType === "seller"
        ? "Initial Private Seller Brief"
        : leadType === "equity"
          ? "Initial Private Equity Brief"
          : "Initial Private Wealth Planning Brief";

  return {
    reportTitle,
    executiveSummary,
    clientObjective: redactNames(ctx.objective, firstName, lastName),
    knownFacts: knownFacts.map((f) => redactNames(f, firstName, lastName)),
    itemsToClarify,
    advisorReviewTopics,
    recommendedNextStep,
  };
}
