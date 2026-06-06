import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";

export type LeadType = "buyer" | "seller" | "equity" | "wealth_forecast";

export interface PrivateClientIntakeContext {
  leadType: LeadType;
  clientName: string;
  objective: string;
  currentProperty?: string;
  targetMarket?: string;
  timeline?: string;
  financingContext?: string;
  privacyLevel?: string;
  advisorsInvolved: string[];
  ownershipStructure?: string;
  needs: string[];
  freeText?: string;
  contactComplete: boolean;
  taxReviewNeeded: boolean;
  legalReviewNeeded: boolean;
  lenderReviewNeeded: boolean;
  wealthReviewNeeded: boolean;
}

function isRealName(firstName: string): boolean {
  const lower = firstName.trim().toLowerCase();
  return (
    lower.length > 0 &&
    !["fixture", "test", "example", "demo", "sample"].includes(lower)
  );
}

export function buildIntakeContext(
  leadType: LeadType,
  quizData: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): PrivateClientIntakeContext {
  const contact = quizData.contact;
  const clientName = isRealName(contact.firstName)
    ? `${contact.firstName} ${contact.lastName}`.trim()
    : "Client";

  const base = {
    leadType,
    clientName,
    advisorsInvolved: [] as string[],
    needs: [] as string[],
    contactComplete: Boolean(
      contact.email && contact.firstName && contact.consentGiven
    ),
    taxReviewNeeded: false,
    legalReviewNeeded: false,
    lenderReviewNeeded: false,
    wealthReviewNeeded: false,
    freeText: quizData.freeText,
  };

  if (leadType === "buyer") {
    const q = quizData as BuyerQuizData;
    return {
      ...base,
      objective: `Acquire ${q.propertyType.replace(/_/g, " ")} in ${q.desiredLocations.join(", ")}`,
      targetMarket: q.desiredLocations.join(", "),
      timeline: q.timeline,
      financingContext: q.financingStatus.replace(/_/g, " "),
      needs: [
        "Licensed agent review",
        q.financingStatus.includes("cash")
          ? "Liquidity coordination"
          : "Lender/private banker review",
      ],
      lenderReviewNeeded: !q.financingStatus.includes("cash"),
    };
  }

  if (leadType === "seller") {
    const q = quizData as SellerQuizData;
    const addr = `${q.propertyAddress.city}, ${q.propertyAddress.state}`;
    return {
      ...base,
      objective: `Sell property in ${addr}`,
      currentProperty: addr,
      timeline: q.sellingTimeline,
      privacyLevel:
        q.photoPrivacyPreference ?? q.showingPrivacyPreference ?? "standard",
      needs: ["Licensed agent review", "Listing strategy coordination"],
      legalReviewNeeded: Boolean(q.priorListingHistory),
    };
  }

  if (leadType === "equity") {
    const q = quizData as EquityQuizData & {
      demoScenario?: string;
      privateClientContext?: Record<string, unknown>;
    };
    if (
      q.demoScenario === "mercer-newport-aspen-transition" &&
      q.privateClientContext
    ) {
      return intakeContextFromPrivateClientDemo({
        ...q.privateClientContext,
        firstName: q.contact.firstName,
        lastName: q.contact.lastName,
      });
    }
    const current = `${q.propertyAddress.city}, ${q.propertyAddress.state}`;
    return {
      ...base,
      objective: `${q.nextMoveGoal.replace(/_/g, " ")} — from ${current} toward ${q.desiredNextLocation}`,
      currentProperty: current,
      targetMarket: q.desiredNextLocation,
      timeline: q.timeline,
      financingContext: q.mortgageBalance
        ? "Partial financing / equity deployment"
        : "Equity deployment context to verify",
      needs: [
        "Licensed agent review",
        "CPA review for planning topics",
        "Attorney review if ownership structure involved",
        "Lender/private banker review",
      ],
      taxReviewNeeded: true,
      legalReviewNeeded: true,
      lenderReviewNeeded: true,
      advisorsInvolved: ["CPA", "attorney", "wealth advisor"],
    };
  }

  const q = quizData as WealthQuizData;
  return {
    ...base,
    objective: `${q.propertyUse.replace(/_/g, " ")} acquisition in ${q.targetLocations.join(", ")}`,
    targetMarket: q.targetLocations.join(", "),
    timeline: q.timeline,
    financingContext: `${q.leveragePreference.replace(/_/g, " ")} · ${q.liquiditySituation.replace(/_/g, " ")}`,
    needs: [
      "Wealth advisor review",
      "CPA review",
      "Lender/private banker review",
    ],
    taxReviewNeeded: true,
    lenderReviewNeeded: true,
    wealthReviewNeeded: true,
    advisorsInvolved: ["wealth advisor", "CPA", "lender/private banker"],
  };
}

export function intakeContextFromPrivateClientDemo(
  raw: Record<string, unknown>
): PrivateClientIntakeContext {
  return {
    leadType: "equity",
    clientName: isRealName(String(raw.firstName ?? ""))
      ? `${raw.firstName} ${raw.lastName}`.trim()
      : "Client",
    objective: String(
      raw.objective ??
        "Sell Aspen property and acquire waterfront property in Newport Beach"
    ),
    currentProperty: String(raw.currentProperty ?? "Aspen, CO"),
    targetMarket: String(raw.targetMarket ?? "Newport Beach, CA"),
    timeline: String(raw.timeline ?? "6–12 months"),
    financingContext: String(raw.financingContext ?? "Partial financing"),
    privacyLevel: String(raw.privacyLevel ?? "high"),
    advisorsInvolved: Array.isArray(raw.advisorsInvolved)
      ? (raw.advisorsInvolved as string[])
      : ["CPA", "attorney", "wealth advisor"],
    ownershipStructure: String(raw.ownershipStructure ?? "Possible trust ownership"),
    needs: Array.isArray(raw.needs)
      ? (raw.needs as string[])
      : [
          "Agent referral",
          "Lender/private banker review",
          "Privacy-first execution",
        ],
    freeText: raw.freeText ? String(raw.freeText) : undefined,
    contactComplete: true,
    taxReviewNeeded: true,
    legalReviewNeeded: true,
    lenderReviewNeeded: true,
    wealthReviewNeeded: true,
  };
}
