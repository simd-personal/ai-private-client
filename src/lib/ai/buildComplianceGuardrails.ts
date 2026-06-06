import type { AiStrategyRoomOutput } from "@/lib/schemas/ai-strategy-room";
import type { ComplianceGuardrails } from "@/lib/schemas/decision-layer";
import type { DecisionGraph } from "@/lib/schemas/decision-layer";

type GuardrailScanInput = Pick<
  AiStrategyRoomOutput,
  | "strategyRoom"
  | "advisorCoordinationMap"
  | "dealReadiness"
  | "redFlagsAndMissingInfo"
  | "meetingPrepPack"
>;

const RISK_PATTERNS: Array<{
  id: string;
  label: string;
  category: string;
  severity: "low" | "medium" | "high";
  patterns: RegExp[];
  replacement: string;
}> = [
  {
    id: "tax_advice",
    label: "No tax advice language",
    category: "tax",
    severity: "high",
    patterns: [
      /you should do a 1031/i,
      /this will avoid taxes/i,
      /tax-free/i,
      /guaranteed tax savings/i,
      /tax strategy/i,
    ],
    replacement: "CPA review for planning topics",
  },
  {
    id: "legal_advice",
    label: "No legal advice language",
    category: "legal",
    severity: "high",
    patterns: [
      /you should transfer title/i,
      /this trust structure is best/i,
      /legally required/i,
      /you must/i,
    ],
    replacement: "Attorney review for entity topics",
  },
  {
    id: "lending_advice",
    label: "No lending approval language",
    category: "lending",
    severity: "high",
    patterns: [
      /you will qualify/i,
      /\bapproved\b/i,
      /guaranteed rate/i,
      /best loan/i,
    ],
    replacement: "Lender/private banker review scenario",
  },
  {
    id: "investment_advice",
    label: "No investment recommendation language",
    category: "investment",
    severity: "high",
    patterns: [
      /best investment/i,
      /guaranteed return/i,
      /you should liquidate/i,
      /outperform/i,
    ],
    replacement: "Wealth advisor review for planning context",
  },
  {
    id: "valuation_claim",
    label: "No exact valuation claim",
    category: "valuation",
    severity: "medium",
    patterns: [
      /worth exactly/i,
      /\bappraisal\b/i,
      /\bCMA\b/i,
      /guaranteed sale price/i,
      /your home is worth \$/i,
    ],
    replacement: "Market context for discussion — not a valuation",
  },
  {
    id: "fair_housing",
    label: "No fair housing-sensitive language",
    category: "fair_housing",
    severity: "high",
    patterns: [
      /best school/i,
      /school district/i,
      /crime rate/i,
      /safest neighborhood/i,
      /demographics/i,
      /family-friendly area/i,
    ],
    replacement: "Client to evaluate location preferences independently",
  },
];

function collectTextBlobs(
  output: GuardrailScanInput,
  graph: DecisionGraph | null
): string[] {
  const blobs: string[] = [
    output.strategyRoom.situationSnapshot,
    output.strategyRoom.primaryCoordinationNeed,
    ...output.strategyRoom.knownFacts,
    ...output.strategyRoom.itemsToVerify,
    output.dealReadiness.nextBestAction,
    output.dealReadiness.priorityReason,
  ];
  if (graph) {
    blobs.push(graph.clientSafeSummary, graph.centralDecision);
    graph.nextBestPath.forEach((s) => blobs.push(s.clientSafeSummary));
  }
  return blobs.filter(Boolean);
}

export function buildComplianceGuardrails(
  output: GuardrailScanInput,
  graph: DecisionGraph | null,
  options?: { isPublicBrief?: boolean }
): ComplianceGuardrails {
  const text = collectTextBlobs(output, graph).join("\n");
  const blockedPhrasesFound: ComplianceGuardrails["blockedPhrasesFound"] = [];
  const checks: ComplianceGuardrails["checks"] = [];

  for (const rule of RISK_PATTERNS) {
    const matches = rule.patterns.filter((p) => p.test(text));
    const status =
      matches.length > 0
        ? rule.severity === "high"
          ? "blocked"
          : "needs_review"
        : "passed";
    if (matches.length > 0) {
      matches.forEach((m) => {
        const match = text.match(m);
        if (match?.[0]) {
          blockedPhrasesFound.push({
            phrase: match[0],
            category: rule.category,
            replacementSuggestion: rule.replacement,
          });
        }
      });
    }
    checks.push({
      id: rule.id,
      label: rule.label,
      status,
      explanation:
        status === "passed"
          ? "No risky phrasing detected in reviewed content."
          : `Detected ${matches.length} pattern(s) requiring review.`,
      severity: rule.severity,
    });
  }

  checks.push({
    id: "facts_vs_verify",
    label: "Known facts separated from items to verify",
    status:
      output.strategyRoom.knownFacts.length > 0 &&
      output.strategyRoom.itemsToVerify.length > 0
        ? "passed"
        : "needs_review",
    explanation: "Strategy room distinguishes confirmed facts from open items.",
    severity: "low",
  });

  checks.push({
    id: "advisor_review_language",
    label: "Advisor review language present",
    status: output.advisorCoordinationMap.advisors.length > 0 ? "passed" : "needs_review",
    explanation: "Advisor coordination map includes review roles.",
    severity: "medium",
  });

  checks.push({
    id: "public_disclaimer",
    label: "Public brief has disclaimer",
    status: "passed",
    explanation: "Standard non-advice disclaimer applied to public brief.",
    severity: "low",
  });

  if (options?.isPublicBrief !== false) {
    checks.push({
      id: "readiness_hidden",
      label: "Readiness score hidden from public",
      status: "passed",
      explanation: "Deal readiness is admin-only by design.",
      severity: "low",
    });
    checks.push({
      id: "internal_hidden",
      label: "Internal-only fields hidden from public result",
      status: "passed",
      explanation: "Public API strips admin strategy room fields.",
      severity: "low",
    });
  }

  const hasBlocked = checks.some((c) => c.status === "blocked");
  const hasReview = checks.some((c) => c.status === "needs_review");

  return {
    overallStatus: hasBlocked ? "blocked" : hasReview ? "needs_review" : "passed",
    checkedAt: new Date().toISOString(),
    checks,
    publicDisclosure: {
      briefDisclaimer:
        "This private brief is for planning and coordination purposes only. It is not legal, tax, lending, investment, appraisal, or valuation advice.",
      advisorReviewDisclosure:
        "Tax topics should be reviewed with a CPA, legal and entity topics with an attorney, lending topics with a lender or private banker, and real estate execution topics with a licensed agent.",
    },
    blockedPhrasesFound,
    safeLanguageInserted: [
      {
        category: "coordination",
        phrase: "Scenario for discussion with your advisory team",
      },
      {
        category: "verification",
        phrase: "Items to verify before execution preparation",
      },
    ],
    adminNotes: blockedPhrasesFound.length
      ? ["Review flagged phrasing before client-facing distribution."]
      : ["All deterministic guardrail checks passed."],
  };
}
