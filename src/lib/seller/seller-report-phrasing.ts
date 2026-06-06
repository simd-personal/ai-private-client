import type { SellerAiReport } from "@/lib/schemas/ai-report";
import { sanitizeEnrichmentText } from "@/lib/seller/sanitize-enrichment-text";

type PhraseRule = {
  pattern: RegExp;
  maxUses: number;
  alternates: string[];
};

const SELLER_PHRASE_RULES: PhraseRule[] = [
  {
    pattern: /\bpricing leverage\b/gi,
    maxUses: 1,
    alternates: [
      "pricing posture",
      "confidential pricing review",
      "value positioning",
    ],
  },
  {
    pattern: /\bprivate market testing\b/gi,
    maxUses: 1,
    alternates: [
      "controlled exposure",
      "broker to broker preview strategy",
      "qualified buyer screening",
    ],
  },
  {
    pattern: /\bbefore public exposure\b/gi,
    maxUses: 1,
    alternates: [
      "ahead of broader market release",
      "before wider marketing",
      "prior to a full launch sequence",
    ],
  },
  {
    pattern: /\bthe strongest path\b/gi,
    maxUses: 1,
    alternates: [
      "the recommended sequence",
      "the strategic approach",
      "the launch plan",
    ],
  },
  {
    pattern: /\bJustin should confirm\b/gi,
    maxUses: 0,
    alternates: [
      "The first review should verify",
      "Confirm during licensed agent review",
      "Verify with the seller and advisory team",
    ],
  },
  {
    pattern: /\bhighest price\b/gi,
    maxUses: 1,
    alternates: [
      "pricing confidence",
      "value positioning",
      "pricing review",
    ],
  },
  {
    pattern: /\bpublic exposure\b/gi,
    maxUses: 1,
    alternates: [
      "broader marketing",
      "wider visibility",
      "full launch",
    ],
  },
  {
    pattern: /\bpricing leverage\b/gi,
    maxUses: 1,
    alternates: [
      "pricing posture",
      "confidential pricing review",
      "value positioning",
    ],
  },
  {
    pattern: /\bprivate market testing\b/gi,
    maxUses: 1,
    alternates: [
      "controlled access",
      "broker-to-broker preview",
      "qualified buyer screening",
    ],
  },
];

const PUBLIC_SAFETY_REPLACERS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\blikely buyer profile\b/gi,
    replacement: "market positioning narrative",
  },
  {
    pattern: /\bbuyer profile\b/gi,
    replacement: "market positioning",
  },
  {
    pattern: /\bbuyers valuing families\b/gi,
    replacement: "buyers valuing space and layout",
  },
];

function replaceWithAlternate(
  text: string,
  match: string,
  alternates: string[],
  index: number
): string {
  const replacement = alternates[index % alternates.length] ?? alternates[0]!;
  const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "i"), replacement);
}

function limitPhrasesInText(
  text: string,
  usage: Map<string, number>,
  rules: PhraseRule[]
): string {
  let result = text;
  for (const rule of rules) {
    const matches = [...result.matchAll(rule.pattern)];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]![0];
      const key = match.toLowerCase();
      const count = usage.get(key) ?? 0;
      if (count < rule.maxUses) {
        usage.set(key, count + 1);
        continue;
      }
      const altIndex = count - rule.maxUses;
      result = replaceWithAlternate(result, match, rule.alternates, altIndex);
      usage.set(key, count + 1);
    }
  }
  for (const { pattern, replacement } of PUBLIC_SAFETY_REPLACERS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function polishMissingFactLanguage(text: string): string {
  return text
    .replace(
      /\bJustin should confirm ([^.]+)\./gi,
      "The first review should verify $1 with the seller before shaping pricing, presentation, and showing protocol."
    )
    .replace(
      /\bJustin should confirm ([^,]+), ([^.]+)\./gi,
      "The first review should verify property facts that shape pricing, presentation, and showing protocol, including $1 and $2."
    );
}

/** Reduces repetitive seller-report phrases across all public sections. */
export function reduceSellerReportRepetition(
  report: SellerAiReport
): SellerAiReport {
  const usage = new Map<string, number>();

  const process = (text: string) =>
    sanitizeEnrichmentText(
      polishMissingFactLanguage(
        limitPhrasesInText(text, usage, SELLER_PHRASE_RULES)
      )
    );

  return {
    ...report,
    summary: process(report.summary),
    sellerStrategy: process(report.sellerStrategy),
    positioningAngle: process(report.positioningAngle),
    prepRecommendations: report.prepRecommendations.map((item) =>
      process(item)
    ),
    questionsForJustin: report.questionsForJustin.map((item) => process(item)),
    recommendedNextStep: process(report.recommendedNextStep),
    suggestedFollowUpMessage: process(report.suggestedFollowUpMessage),
    internalLeadSummary: report.internalLeadSummary,
  };
}
