import type { SellerAiReport } from "@/lib/schemas/ai-report";
import type { SellerQuizData } from "@/lib/schemas/quiz";

export const SELLER_PRIORITY_PUBLIC_LABELS: Record<
  SellerQuizData["sellerPriority"],
  string
> = {
  "highest price": "achieving the highest price",
  privacy: "maintaining privacy",
  speed: "timing and certainty",
  relocation: "supporting a relocation timeline",
  "off market sale": "pursuing an off-market sale",
  "market testing": "testing market response",
};

export function getSellerPriorityPublicLabel(
  priority: SellerQuizData["sellerPriority"]
): string {
  return SELLER_PRIORITY_PUBLIC_LABELS[priority];
}

export function buildSellerPriorityGuidance(data: SellerQuizData): string {
  const label = getSellerPriorityPublicLabel(data.sellerPriority);
  const freeText = data.freeText?.toLowerCase() ?? "";
  const mentionsPrice =
    /\b(highest price|top dollar|maximize price|best price)\b/i.test(freeText);
  const mentionsPrivacy =
    /\b(privacy|discretion|confidential|off.?market|limited exposure)\b/i.test(
      freeText
    );

  let guidance = `The seller's selected priority is "${data.sellerPriority}". In public sections, treat the primary priority as ${label}. Do NOT call a different priority the primary focus.`;

  if (data.sellerPriority === "privacy") {
    guidance +=
      " Privacy or discretion is the primary priority — do not state that achieving the highest price is the primary priority.";
    if (mentionsPrice) {
      guidance +=
        " If pricing is mentioned in free text, you may note that privacy is the stated priority while pricing confidence should be reviewed before launch.";
    }
  } else if (data.sellerPriority === "highest price" && mentionsPrivacy) {
    guidance +=
      " Free text mentions privacy; you may note pricing is the stated priority while discretion requirements should still be respected in the launch plan.";
  }

  return guidance;
}

const WRONG_PRIMARY_FOR_PRIVACY: Array<{ pattern: RegExp; replacement: string }> =
  [
    {
      pattern:
        /\b(?:the\s+)?primary\s+priority\s+is\s+(?:achieving\s+)?(?:the\s+)?highest\s+price\b/gi,
      replacement: "the primary priority is maintaining privacy",
    },
    {
      pattern:
        /\b(?:main|top|stated)\s+priority\s+is\s+(?:achieving\s+)?(?:the\s+)?highest\s+price\b/gi,
      replacement: "stated priority is maintaining privacy",
    },
    {
      pattern:
        /\bpriority\s+is\s+achieving\s+the\s+highest\s+price\b/gi,
      replacement: "priority is maintaining privacy",
    },
    {
      pattern:
        /\bwith\s+a\s+priority\s+of\s+achieving\s+the\s+highest\s+price\b/gi,
      replacement: "with a priority of maintaining privacy",
    },
    {
      pattern:
        /\bfocused\s+on\s+achieving\s+the\s+highest\s+price\b/gi,
      replacement: "focused on maintaining privacy",
    },
  ];

function applyPrivacyPriorityFixes(text: string): string {
  let result = text;
  for (const { pattern, replacement } of WRONG_PRIMARY_FOR_PRIVACY) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function processSellerReportText(
  text: string,
  data: SellerQuizData
): string {
  if (data.sellerPriority !== "privacy") return text;
  return applyPrivacyPriorityFixes(text);
}

/** Keeps public seller copy aligned with the quiz-selected sellerPriority. */
export function enforceSellerPriorityConsistency(
  report: SellerAiReport,
  data: SellerQuizData
): SellerAiReport {
  return {
    ...report,
    summary: processSellerReportText(report.summary, data),
    sellerStrategy: processSellerReportText(report.sellerStrategy, data),
    positioningAngle: processSellerReportText(report.positioningAngle, data),
    prepRecommendations: report.prepRecommendations.map((item) =>
      processSellerReportText(item, data)
    ),
    questionsForJustin: report.questionsForJustin.map((item) =>
      processSellerReportText(item, data)
    ),
    suggestedFollowUpMessage: processSellerReportText(
      report.suggestedFollowUpMessage,
      data
    ),
    recommendedNextStep: processSellerReportText(
      report.recommendedNextStep,
      data
    ),
  };
}
