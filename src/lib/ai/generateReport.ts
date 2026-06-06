import {
  buildModelSelectionForBuyer,
  buildModelSelectionForSeller,
} from "@/lib/ai/build-model-selection";
import { createStructuredChatCompletion } from "@/lib/ai/buildOpenAIRequestOptions";
import {
  generateOpenAiReportWithModelOrder,
  getDeterministicFallbackMeta,
  getOpenAIClient,
} from "@/lib/ai/openai-report-client";
import {
  postProcessBuyerReport,
  postProcessSellerReport,
} from "@/lib/ai/post-process-report";
import {
  getPremiumReportModel,
  DETERMINISTIC_FALLBACK_MODEL,
} from "@/lib/ai/selectReportModel";
import {
  areaFitReason,
  budgetFitExplanation,
  buildBuyerFollowUpMessage,
  buildBuyerReportTitle,
  buildSellerFollowUpMessage,
  buildSellerReportTitle,
  getBuyerRecommendedNextStep,
  getSellerPremiumRecommendedNextStep,
  SELLER_RECOMMENDED_NEXT_STEP,
  estimateBudgetRating,
  estimateBuyerReadiness,
  estimateSellerReadiness,
  formatList,
  isRealFirstName,
  labelBudget,
  labelCondition,
  labelFinancing,
  labelSellerPriority,
  labelSellingTimeline,
  labelTimeline,
  logReportSource,
  titleCase,
  type ReportSource,
} from "@/lib/ai/report-labels";
import {
  buyerAiReportSchema,
  sellerAiReportSchema,
  type BuyerAiReport,
  type SellerAiReport,
} from "@/lib/schemas/ai-report";
import { getLockedDisplayAddress } from "@/lib/property/getLockedDisplayAddress";
import { buildPublicPropertyIntelligenceForPrompt } from "@/lib/property/publicPropertyIntelligence";
import type { PropertyIntelligence } from "@/lib/property/types";
import { formatPublicAddress } from "@/lib/seller/seller-address-phrasing";
import { buildSellerPriorityGuidance } from "@/lib/seller/seller-priority-consistency";
import {
  isPremiumSellerValue,
  isUltraLuxurySellerValue,
} from "@/lib/seller/seller-tier";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import { generateEquityReport, type GeneratedEquityReport } from "@/lib/ai/generateEquityReport";
import {
  generateWealthForecastReport,
  type GeneratedWealthForecastReport,
} from "@/lib/ai/generateWealthForecastReport";
import {
  getDefaultTenant,
  getTenantSupportedRegionLabel,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";

/** @deprecated Use getPremiumReportModel() from selectReportModel */
export const REPORT_MODEL = getPremiumReportModel();

export type { ReportSource };

export interface ReportGenerationResult<T> {
  report: T;
  source: ReportSource;
  model: string;
  durationMs: number;
  leadScore: number;
  fallbackModelAttempted: boolean;
  premiumModelFailed: boolean;
  miniBackupModelFailed: boolean;
  premiumModelFailedError?: string;
  miniBackupModelFailedError?: string;
  error?: string;
}

export type GeneratedBuyerReport = ReportGenerationResult<BuyerAiReport>;
export type GeneratedSellerReport = ReportGenerationResult<SellerAiReport>;
export type GeneratedReport =
  | GeneratedBuyerReport
  | GeneratedSellerReport
  | GeneratedEquityReport
  | GeneratedWealthForecastReport;

function buildSystemMessage(tenant: TenantConfig): string {
  return `You are a private luxury real estate planning assistant for ${tenant.agentName}, a licensed ${tenant.supportedStates.join(", ")} real estate professional at ${tenant.brandName}.

VOICE: Premium private advisory note — polished, calm, strategic, substantive but not verbose. Write like ${tenant.agentName}'s internal strategy memo to a client, not a generic intake form result. Reference the user's actual quiz answers (locations, budget range, property type, priorities, timeline, financing, free text).

You do NOT have live MLS, IDX, or real-time inventory data. Never imply current listing access, live comps, or real-time market feeds. Speak in terms of submarkets, communities, inventory tradeoffs, ownership priorities, resale considerations, location, condition, HOA structure, and timing.

BANNED PHRASES — never use:
You are looking for, This area offers, unique coastal lifestyle, desirable locations, maximize your outcome, maximize, ensure, neighborhood benefits, I hope this message finds you well, Please let me know how you would like to proceed, vibrant neighborhoods, best neighborhoods, perfect fit, ideal for you, guaranteed, investment potential, promising returns, hottest areas, can't miss, dream home, known for its luxurious estates, rich artistic community, beautiful coastal estates, stunning views, stunning coastal views, current market dynamics, is known for

TRAVEL BROCHURE LANGUAGE — avoid marketing copy about areas. Never describe cities as luxurious, artistic, beautiful, or stunning. Instead use: has inventory patterns that may support estate searches, should be evaluated by property condition, location, privacy, views, and timing, requires careful comparison of privacy, architecture, access, and resale considerations, should be reviewed against the user's stated timing and preparation goals

PREFERRED LANGUAGE:
Your search profile points toward, The strongest path is to, The main tradeoff to evaluate is, This range should be pressure tested against, ${tenant.agentName} can help compare, The next step is to review, Before going public, the seller strategy should, submarkets, communities to prioritize, ownership priorities, resale considerations, inventory tradeoffs, competitive but inventory dependent, well positioned for certain property types, final fit depends on inventory, strengthen your market position, protect pricing leverage, evaluate the strongest listing path, prepare the home before public exposure, Costa Mesa positioning, property presentation, buyer objections, showing readiness, private market testing, launch timing

COMPLIANCE — strictly follow:
- No exact home valuations, price guarantees, appreciation claims, or lending approval promises
- No schools, safety, crime, demographics, families, religion, protected classes, or suitability based on personal traits
- No "best for families" or definitive neighborhood character claims
- Frame tradeoffs around property features, inventory, budget, timing, HOA, commute, and lifestyle preferences only
- ${tenant.agentName} confirms strategy before any buying or selling decision`;
}

function tenantifyPromptText(text: string, tenant: TenantConfig): string {
  return text
    .replace(/\bJustin Kuo\b/g, tenant.agentName)
    .replace(/\bJustin\b/g, tenant.agentName)
    .replace(/\bAstoria Luxury Estates\b/g, tenant.brandName)
    .replace(/\bAstoria AI Home Match\b/g, tenant.brandName)
    .replace(/\bAstoria\b/g, tenant.brandName)
    .replace(/\bCalifornia\b/g, getTenantSupportedRegionLabel(tenant));
}

const BUYER_INSTRUCTIONS = `Generate a buyer private client brief as JSON.

LENGTH TARGETS (stay within these ranges — concise but substantive):
- summary: 80–130 words
- bestFitAreas[].reason: 45–80 words each
- budgetFit.explanation: 45–80 words
- propertyRecommendation: 50–90 words

1. reportTitle — If contact.firstName is a real personal name (not Fixture/Test/Example/Demo/Sample), use exactly: "Your Private Private Client Brief, FirstName". Otherwise use: "Your Private California Private Client Brief". Never put city names or property types in the title.

2. summary — Advisory tone. Must weave in: selected location(s), budget range, property type, timeline, financing status, two or three lifestyle priorities, one clear tradeoff, and one clear next action with the licensed agent. Open with patterns like "Your search profile points toward..." rather than "You are looking for...". Example tone (do not copy verbatim): focused strategy vs broad search, budget room to compare construction/HOA/location/space, timeline and financing context, next step to pressure test criteria against a curated shortlist.

3. bestFitAreas — one entry per desiredLocations (max 4). The "area" field must be EXACTLY one of the user's desiredLocations strings — do not invent sub-neighborhoods, community names, or micro-markets (e.g. use "Irvine" not "Irvine Spectrum"). Tie reasons to lifestylePriorities with one compliant inventory tradeoff each. fitScore 60–88 only; avoid scores above 90. Use "The main tradeoff to evaluate is..." language.

4. budgetFit — rating must be "moderate" by default. Use "challenging" only when budget is clearly tight for the property type and market. Use "strong" rarely — only with explicit caveat that fit remains inventory dependent. Explanation must use careful language: "This range should be pressure tested against...", "competitive but inventory dependent", "well positioned for certain property types", "final fit depends on inventory, HOA costs, condition, location, and offer terms". Never sound certain without live inventory data.

5. propertyRecommendation — specific to property type and priorities. Mention tradeoffs: newer construction vs location, HOA vs interior space, maintenance vs convenience. the licensed agent can help compare options.

6. readinessScore — 0–100 based on timeline, financing, clarity of priorities, free text.

7. recommendedNextStep — use exactly: "The next step is to review a curated shortlist with the licensed agent and compare each option against budget, property type, timing, and the main tradeoffs."

FINANCING IN FOLLOW-UP — match financingStatus:
- cash buyer: say "offer strategy, proof of funds, and timing" — never "financing path"
- pre approved: "approval strength, offer strategy, and timing"
- talking to lender: "financing path, offer strategy, and timing"
- just exploring: "readiness, timing, and search strategy"

8. questionsForJustin — exactly 4 questions. Use their city, budget, property type, and priorities. Good patterns:
   - "Which [City] communities should we prioritize based on budget, lifestyle priorities, and inventory?"
   - "How should I compare newer construction, HOA costs, location, and interior space?"
   - "What tradeoffs should I expect at this price point in [City]?"
   - "What should I review first if I want to be ready within my timeline?"
   Never ask about "best neighborhoods", "investment potential", or guaranteed outcomes.

9. internalLeadSummary — concise CRM note with name, locations, budget, timeline, financing, signals.

10. suggestedFollowUpMessage — polished agent text or email from the licensed agent. If firstName is Fixture/Test/Example/Demo/Sample, open with "Hi there," — never use placeholder names. For real names, open with "Hi FirstName,". Reference location, property type, budget range, timeline. FINANCING PHRASES (match financingStatus): cash buyer → "offer strategy, proof of funds, and timing" (never "financing path"); pre approved → "approval strength, offer strategy, and timing"; talking to lender → "financing path, offer strategy, and timing"; just exploring → "readiness, timing, and search strategy". Pattern: acknowledge plan review → name next step → offer curated shortlist.`;

const SELLER_INSTRUCTIONS_BASE = `Generate a seller luxury listing strategy plan as JSON.

PUBLIC SECTION ROLES — each field must feel distinct; do not repeat the same sentence across sections:
- summary: High-level seller situation — property type, value range, timeline, privacy or seller priority, and strategic direction only.
- sellerStrategy: Specific launch sequence, preparation plan, controlled exposure, and consultation path.
- positioningAngle: Market positioning narrative — how the property should be presented based on verified facts and seller-provided details. NEVER use "buyer profile", "likely buyer profile", or demographic framing.
- prepRecommendations: Concrete checklist tied to property details, upgrades, and missing facts.
- questionsForJustin: Questions that move the seller toward a confidential strategy review with the licensed agent.

ADDRESS — reportGuidance includes lockedDisplayAddress and publicDisplayAddress:
- Street number and street name must match lockedDisplayAddress exactly — never invent or expand them (e.g. do not change 18 to 1800).
- In public copy, prefer publicDisplayAddress (street + city only — no state, ZIP, or USA).
- Use publicDisplayAddress at most once in the summary or seller strategy, then refer naturally as this {city} residence, the residence, the home, or this property.
- Do NOT write "For the property, {city}" or repeat the city name in the address line.
- Do NOT produce addresses like "Street, City, City" — use publicDisplayAddress exactly.
- Do NOT start prepRecommendations or questionsForJustin with the full address.
- prepRecommendations must start with direct action verbs (Complete, Prepare, Verify, Align, Document, etc.).
- questionsForJustin must start naturally and must not repeat the address.
- Bad prep opening: "For 218 E Oceanfront, Newport Beach, CA 92661, USA, complete a garage organization audit."
- Good prep opening: "Complete a garage organization and storage presentation audit so the garage reads as clean, usable, and consistent with the property narrative."
- Bad question opening: "For 218 E Oceanfront..., which property facts must be verified first?"
- Good question opening: "Which property facts should be verified first so the confidential pricing review is defensible?"

SELLER PRIORITY — follow sellerPriorityGuidance in reportGuidance:
- The quiz-selected seller priority is authoritative for what is called the primary priority.
- Do not substitute a different priority (e.g. do not call highest price the primary priority when privacy was selected).

PROPERTY INTELLIGENCE — when propertyIntelligence is provided:
- Use ONLY facts present in sellerProvidedFacts, propertyFacts, upgradeSignals, prepFocusAreas, buyerObjectionRisks, verificationNotes, and addressValidationContext (general amenities only).
- Do NOT invent property facts. If missing, weave verificationNotes themes using premium phrasing such as "The first review should verify..." — never repeat "the licensed agent should confirm" in every section.
- Do NOT mention RentCast, Google Maps, external normalization, or exact third-party mismatch details in public sections. Use only: third-party property data, address validation, seller-provided facts.
- Do NOT claim MLS, Zillow, Redfin, Realtor.com, or RPR was reviewed unless explicitly in adminNotes or seller freeText.
- internalContext.rentCastEstimatedValue is internal-only — NEVER state it as a list price or valuation.
- Never make school, safety, crime, demographic, protected-class, or family-status claims.

PHRASE DISCIPLINE — use each concept at most once across the full report:
- pricing leverage / private market testing / before public exposure / the strongest path
Prefer varied language: controlled exposure, qualified buyer screening, confidential pricing review, launch sequence, property narrative, presentation audit, discretion-first approach.

LENGTH TARGETS:
- summary: 80–130 words
- sellerStrategy: 60–100 words
- positioningAngle: 60–100 words
- suggestedFollowUpMessage: 50–90 words

1. reportTitle — Real first name → "Your Private Seller Strategy Plan, FirstName". Otherwise → "Your Private California Seller Strategy Plan".

2. summary — Private advisory tone. Property-specific facts when provided.

3. sellerStrategy — Launch sequence and prep; tie to upgradeSignals and buyerObjectionRisks when present.

4. positioningAngle — Architectural narrative, outdoor living, privacy controls, feature inventory, and presentation standards from verified inputs only. No buyer-profile language.

5. prepRecommendations — 3–5 actionable items from prepFocusAreas and property facts.

6. readinessScore — 0–100.

7. recommendedNextStep — Use the exact recommendedNextStep string from reportGuidance in the user message.

8. questionsForJustin — 4 consultation-oriented questions; incorporate verificationNotes themes without duplicating prepRecommendations verbatim.

9. internalLeadSummary — CRM note with enrichmentSources (admin may include vendor detail).

10. suggestedFollowUpMessage — Discreet tone from the licensed agent. Fixture names → "Hi there,". No valuation guarantees.`;

const SELLER_INSTRUCTIONS_PREMIUM = `

PREMIUM / ULTRA-LUXURY SELLER (estimated value $5M+):
- Write like a discreet private listing strategy memo — not a generic AI intake result.
- Prefer: confidential launch sequence, controlled access, qualified showing protocol, presentation standards, documentation package, property fact verification, broker-to-broker preview, discretion requirements, qualified buyer screening, confidential pricing review, property narrative, architectural narrative, outdoor living presentation, privacy controls, feature inventory, presentation audit, discretion-first approach.
- For $10M+ properties, emphasize confidentiality, limited marketing footprint, and launch sequencing over mass-market tactics.
- Avoid overusing: highest price, pricing leverage, private market testing, before public exposure, public exposure, the strongest path, the licensed agent should confirm.
- positioningAngle is shown publicly as "Private Market Positioning" — write accordingly.
- questionsForthe licensed agent should advance a private strategy call, not repeat summary bullets.`;

function buildSellerInstructions(data: SellerQuizData): string {
  if (isPremiumSellerValue(data.estimatedValueRange)) {
    return SELLER_INSTRUCTIONS_BASE + SELLER_INSTRUCTIONS_PREMIUM;
  }
  return SELLER_INSTRUCTIONS_BASE;
}

function sellerRecommendedNextStep(data: SellerQuizData): string {
  const tenant = getDefaultTenant();
  return isPremiumSellerValue(data.estimatedValueRange)
    ? getSellerPremiumRecommendedNextStep(tenant)
    : SELLER_RECOMMENDED_NEXT_STEP;
}

const buyerJsonSchema = {
  type: "object",
  properties: {
    reportTitle: { type: "string" },
    summary: { type: "string" },
    bestFitAreas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string" },
          reason: { type: "string" },
          fitScore: { type: "number" },
        },
        required: ["area", "reason", "fitScore"],
        additionalProperties: false,
      },
    },
    budgetFit: {
      type: "object",
      properties: {
        rating: { type: "string", enum: ["strong", "moderate", "challenging"] },
        explanation: { type: "string" },
      },
      required: ["rating", "explanation"],
      additionalProperties: false,
    },
    propertyRecommendation: { type: "string" },
    readinessScore: { type: "number" },
    recommendedNextStep: { type: "string" },
    questionsForJustin: { type: "array", items: { type: "string" } },
    internalLeadSummary: { type: "string" },
    suggestedFollowUpMessage: { type: "string" },
  },
  required: [
    "reportTitle",
    "summary",
    "bestFitAreas",
    "budgetFit",
    "propertyRecommendation",
    "readinessScore",
    "recommendedNextStep",
    "questionsForJustin",
    "internalLeadSummary",
    "suggestedFollowUpMessage",
  ],
  additionalProperties: false,
} as const;

const sellerJsonSchema = {
  type: "object",
  properties: {
    reportTitle: { type: "string" },
    summary: { type: "string" },
    sellerStrategy: { type: "string" },
    positioningAngle: { type: "string" },
    prepRecommendations: { type: "array", items: { type: "string" } },
    readinessScore: { type: "number" },
    recommendedNextStep: { type: "string" },
    questionsForJustin: { type: "array", items: { type: "string" } },
    internalLeadSummary: { type: "string" },
    suggestedFollowUpMessage: { type: "string" },
  },
  required: [
    "reportTitle",
    "summary",
    "sellerStrategy",
    "positioningAngle",
    "prepRecommendations",
    "readinessScore",
    "recommendedNextStep",
    "questionsForJustin",
    "internalLeadSummary",
    "suggestedFollowUpMessage",
  ],
  additionalProperties: false,
} as const;

function logFallbackError(leadType: "buyer" | "seller", error: unknown): string {
  const meta = getDeterministicFallbackMeta(error);
  console.log("OpenAI failed, using fallback report");
  if (
    process.env.NODE_ENV === "development" ||
    process.env.AI_TEST === "1"
  ) {
    if (meta.premiumModelFailedError) {
      console.error(`[report:${leadType}] premium failed:`, meta.premiumModelFailedError);
    }
    if (meta.miniBackupModelFailedError) {
      console.error(`[report:${leadType}] mini backup failed:`, meta.miniBackupModelFailedError);
    }
  }
  return meta.error;
}

function buildBuyerQuizContext(data: BuyerQuizData): string {
  const tenant = getDefaultTenant();
  return JSON.stringify(
    {
      tenant: {
        slug: tenant.slug,
        brandName: tenant.brandName,
        agentName: tenant.agentName,
        serviceAreas: tenant.serviceAreas,
        supportedStates: tenant.supportedStates,
        disclaimerText: tenant.disclaimerText,
      },
      desiredLocations: data.desiredLocations,
      budgetRange: data.budgetRange,
      budgetLabel: labelBudget(data.budgetRange),
      propertyType: data.propertyType,
      lifestylePriorities: data.lifestylePriorities,
      timeline: data.timeline,
      timelineLabel: labelTimeline(data.timeline),
      financingStatus: data.financingStatus,
      financingLabel: labelFinancing(data.financingStatus),
      freeText: data.freeText ?? null,
      contact: {
        firstName: data.contact.firstName,
        usePersonalizedTitle: isRealFirstName(data.contact.firstName),
      },
    },
    null,
    2
  );
}

function buildSellerQuizPayload(
  data: SellerQuizData
): Record<string, unknown> {
  return {
    propertyAddress: data.propertyAddress,
    estimatedValueRange: data.estimatedValueRange,
    valueLabel: labelBudget(data.estimatedValueRange),
    propertyCondition: data.propertyCondition,
    conditionLabel: labelCondition(data.propertyCondition),
    sellingTimeline: data.sellingTimeline,
    timelineLabel: labelSellingTimeline(data.sellingTimeline),
    sellerPriority: data.sellerPriority,
    priorityLabel: labelSellerPriority(data.sellerPriority),
    upgrades: data.upgrades ?? null,
    recentUpgrades: data.recentUpgrades ?? null,
    freeText: data.freeText ?? null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    squareFeet: data.squareFeet ?? null,
    lotSize: data.lotSize ?? null,
    yearBuilt: data.yearBuilt ?? null,
    propertyType: data.propertyType ?? null,
    hoaStatus: data.hoaStatus ?? null,
    poolStatus: data.poolStatus ?? null,
    garageSpaces: data.garageSpaces ?? null,
    notableFeatures: data.notableFeatures ?? null,
    buyerObjectionConcerns: data.buyerObjectionConcerns ?? null,
    viewType: data.viewType ?? null,
    waterProximity: data.waterProximity ?? null,
    gatedOrPrivateAccess: data.gatedOrPrivateAccess ?? null,
    poolSpa: data.poolSpa ?? null,
    guestHouse: data.guestHouse ?? null,
    elevator: data.elevator ?? null,
    outdoorKitchen: data.outdoorKitchen ?? null,
    wineRoom: data.wineRoom ?? null,
    theater: data.theater ?? null,
    gym: data.gym ?? null,
    smartHome: data.smartHome ?? null,
    architectDesigner: data.architectDesigner ?? null,
    photoPrivacyPreference: data.photoPrivacyPreference ?? null,
    showingPrivacyPreference: data.showingPrivacyPreference ?? null,
    priorListingHistory: data.priorListingHistory ?? null,
    isPremiumSeller: isPremiumSellerValue(data.estimatedValueRange),
    isUltraLuxurySeller: isUltraLuxurySellerValue(data.estimatedValueRange),
    contact: {
      firstName: data.contact.firstName,
      usePersonalizedTitle: isRealFirstName(data.contact.firstName),
    },
  };
}

function buildSellerReportPromptContext(
  data: SellerQuizData,
  propertyIntelligence?: PropertyIntelligence | null
): string {
  const tenant = getDefaultTenant();
  const locked = getLockedDisplayAddress(
    data.propertyAddress,
    propertyIntelligence
  );
  const publicDisplayAddress = formatPublicAddress(
    locked.lockedDisplayAddress,
    data.propertyAddress.city
  );
  const quiz = {
    ...buildSellerQuizPayload(data),
    lockedDisplayAddress: locked.lockedDisplayAddress,
    publicDisplayAddress,
  };
  const reportGuidance = {
    recommendedNextStep: sellerRecommendedNextStep(data),
    positioningSectionPublicLabel: isPremiumSellerValue(data.estimatedValueRange)
      ? "Private Market Positioning"
      : "Market Positioning",
    lockedDisplayAddress: locked.lockedDisplayAddress,
    publicDisplayAddress,
    submittedAddress: locked.submittedAddress,
    addressUsageRule:
      "Match street number and street name to lockedDisplayAddress. In public sections use publicDisplayAddress at most once (summary or sellerStrategy), then say the property / the residence / this city residence. Never prefix prepRecommendations or questionsForJustin with the full address.",
    sellerPriorityGuidance: buildSellerPriorityGuidance(data),
    tenantBrandName: tenant.brandName,
    tenantAgentName: tenant.agentName,
    tenantServiceAreas: tenant.serviceAreas,
    tenantSupportedStates: tenant.supportedStates,
    tenantDisclaimerText: tenant.disclaimerText,
  };

  if (!propertyIntelligence) {
    return JSON.stringify({ quiz, reportGuidance }, null, 2);
  }

  const propertyIntelligenceForPrompt = buildPublicPropertyIntelligenceForPrompt(
    propertyIntelligence
  );
  propertyIntelligenceForPrompt.addressForStrategy = locked.lockedDisplayAddress;
  const validationCtx = propertyIntelligenceForPrompt.addressValidationContext as
    | Record<string, unknown>
    | undefined;
  if (validationCtx) {
    validationCtx.addressUsedForStrategy = locked.lockedDisplayAddress;
  }

  return JSON.stringify(
    {
      quiz,
      reportGuidance,
      propertyIntelligence: propertyIntelligenceForPrompt,
      internalContext: {
        rentCastEstimatedValue:
          propertyIntelligence.rentCastFacts?.estimatedValue ?? null,
        addressDiscrepancy: propertyIntelligence.addressDiscrepancy,
        rentCastMismatchCount: propertyIntelligence.rentCastMismatches.length,
        complianceNote:
          "RentCast estimated value is internal-only. Do not publish as fact. Do not expose address or fact mismatches in public sections.",
      },
    },
    null,
    2
  );
}

function buildFallbackBuyerReport(data: BuyerQuizData): BuyerAiReport {
  const tenant = getDefaultTenant();
  const locations = data.desiredLocations;
  const primaryLocation = locations[0] ?? "your selected market";
  const locationText = formatList(locations);
  const priorityText = formatList(
    data.lifestylePriorities.map((p) => p.toLowerCase())
  );
  const property = titleCase(data.propertyType);
  const budget = labelBudget(data.budgetRange);
  const timeline = labelTimeline(data.timeline);
  const financing = labelFinancing(data.financingStatus);
  const rating = estimateBudgetRating(data.budgetRange, data.propertyType);
  const readiness = estimateBuyerReadiness(data);

  const freeTextNote = data.freeText?.trim()
    ? ` Note: "${data.freeText.trim().slice(0, 200)}${data.freeText.length > 200 ? "…" : ""}"`
    : "";

  const tradeoff =
    data.lifestylePriorities.length >= 2
      ? `The main tradeoff to evaluate is how ${data.lifestylePriorities[0]!.toLowerCase()} and ${data.lifestylePriorities[1]!.toLowerCase()} balance against location, HOA structure, and active inventory.`
      : "The main tradeoff to evaluate is how location, condition, and HOA structure balance against your stated priorities and active inventory.";

  return {
    reportTitle: buildBuyerReportTitle(data.contact.firstName, tenant),
    summary: `Your search profile points toward a focused ${primaryLocation} ${property.toLowerCase()} strategy rather than a broad county-wide search. At ${budget} on a ${timeline.toLowerCase()} timeline, with ${financing}, your criteria center on ${priorityText}. ${tradeoff} Since lender conversations are already part of your path, the next step is to review a curated shortlist with ${tenant.agentName} and pressure test your criteria against current inventory.${freeTextNote}`,
    bestFitAreas: locations.slice(0, 4).map((area, i) => ({
      area,
      reason: areaFitReason(area, data.lifestylePriorities, tenant),
      fitScore: Math.max(62, 82 - i * 5),
    })),
    budgetFit: {
      rating,
      explanation: budgetFitExplanation(data, locations, tenant),
    },
    propertyRecommendation: `The strongest path is to prioritize ${property.toLowerCase()} options aligned with ${priorityText} in ${primaryLocation}. ${tenant.agentName} can help compare newer construction, HOA structure, interior space, and commute tradeoffs before narrowing communities to prioritize. Final fit depends on active inventory, offer terms, and how flexible you are around presentation and timing.`,
    readinessScore: readiness,
    recommendedNextStep: getBuyerRecommendedNextStep(tenant),
    questionsForJustin: [
      `Which ${primaryLocation} communities should we prioritize based on ${budget}, ${priorityText}, and inventory?`,
      `How should I compare newer construction, HOA costs, location, and interior space in ${locationText}?`,
      `What tradeoffs should I expect at this price point in ${primaryLocation}?`,
      `What should I review first if I want to be ready within my ${timeline.toLowerCase()} timeline?`,
    ],
    internalLeadSummary: `Buyer: ${data.contact.firstName} ${data.contact.lastName}. Locations: ${locationText}. Budget: ${budget}. Property: ${property}. Priorities: ${priorityText}. Timeline: ${timeline}. Financing: ${financing}. Readiness: ${readiness}/100.${freeTextNote}`,
    suggestedFollowUpMessage: buildBuyerFollowUpMessage(data, tenant),
  };
}

function buildFallbackSellerReport(
  data: SellerQuizData,
  propertyIntelligence?: PropertyIntelligence | null
): SellerAiReport {
  const tenant = getDefaultTenant();
  const locked = getLockedDisplayAddress(
    data.propertyAddress,
    propertyIntelligence
  );
  const { city, state } = data.propertyAddress;
  const addressPhrase = formatPublicAddress(
    locked.lockedDisplayAddress,
    data.propertyAddress.city
  );
  const value = labelBudget(data.estimatedValueRange);
  const timeline = labelSellingTimeline(data.sellingTimeline);
  const priority = labelSellerPriority(data.sellerPriority);
  const condition = labelCondition(data.propertyCondition);
  const readiness = estimateSellerReadiness(data);

  const facts = propertyIntelligence?.propertyFacts ?? {};
  const factParts: string[] = [];
  if (facts.bedrooms != null) factParts.push(`${facts.bedrooms} bedrooms`);
  if (facts.bathrooms != null) factParts.push(`${facts.bathrooms} bathrooms`);
  if (facts.squareFeet != null) factParts.push(`${facts.squareFeet} sq ft`);
  if (facts.propertyType != null) factParts.push(String(facts.propertyType));
  const isPremium = isPremiumSellerValue(data.estimatedValueRange);
  const specsNote = factParts.length
    ? ` Property details on file: ${factParts.join(", ")}.`
    : isPremium
      ? " The first review should verify core property specs that shape pricing, presentation, and showing protocol."
      : " The first review should verify bedroom count, baths, size, and property type with you.";

  const upgradesNote = data.upgrades?.trim()
    ? ` Recent upgrades noted: ${data.upgrades.trim().slice(0, 200)}${data.upgrades.length > 200 ? "…" : ""}.`
    : "";

  const freeTextNote = data.freeText?.trim()
    ? ` Seller note: "${data.freeText.trim().slice(0, 150)}${data.freeText.length > 150 ? "…" : ""}".`
    : "";

  const prepRecs = isPremium
    ? [
        `Complete a presentation audit for this ${condition} ${city} property — architectural narrative, outdoor living, and feature inventory.`,
        `Prepare a documentation package covering upgrades, HOA or guard-gated details if applicable, and showing privacy requirements.`,
        `Align the launch sequence with your ${timeline.toLowerCase()} goal and ${priority.toLowerCase()} objective using a discretion-first approach.`,
      ]
    : [
        `Review presentation priorities for a ${condition} property in ${city} — staging, photography, and key feature highlighting.`,
        `Gather documentation on recent improvements, HOA details (if applicable), and property specs buyers will ask about first.`,
        `Align launch timing with your ${timeline.toLowerCase()} goal and ${priority} objective before setting a marketing sequence.`,
      ];

  if (propertyIntelligence?.prepFocusAreas.length) {
    for (const area of propertyIntelligence.prepFocusAreas.slice(0, 2)) {
      prepRecs.push(area);
    }
  }

  if (data.propertyCondition === "needs work") {
    prepRecs.push(
      "Identify high-impact repairs or cosmetic updates that improve buyer perception without over-investing before listing."
    );
  } else if (
    data.propertyCondition === "luxury renovated" ||
    data.propertyCondition === "new construction"
  ) {
    prepRecs.push(
      "Emphasize premium finishes, quality of renovation or build, and move-in readiness in marketing materials."
    );
  }

  const objectionNote =
    propertyIntelligence?.buyerObjectionRisks[0] != null
      ? ` Anticipate: ${propertyIntelligence.buyerObjectionRisks[0].slice(0, 120)}.`
      : "";

  const strategyLead = isPremium
    ? `Your seller situation for ${addressPhrase} points toward a discreet ${city} launch focused on ${priority.toLowerCase()} within a ${timeline.toLowerCase()} window.`
    : `Your seller profile for ${addressPhrase} points toward a ${city}, ${state} strategy focused on ${priority} within a ${timeline.toLowerCase()} timeline.`;

  return {
    reportTitle: buildSellerReportTitle(data.contact.firstName, tenant),
    summary: `${strategyLead} The property is ${condition} and falls in the ${value} range.${specsNote}${isPremium ? ` The strategic direction is a controlled exposure plan with a presentation audit and confidential pricing review with ${tenant.agentName}.` : ` ${tenant.agentName} can help align presentation, timing, and go-to-market sequencing.`}${upgradesNote}${freeTextNote}`,
    sellerStrategy: isPremium
      ? `The recommended sequence is a documentation package and presentation audit first, then qualified buyer screening and broker to broker preview conversations aligned with your ${timeline.toLowerCase()} timeline.${objectionNote} ${tenant.agentName} can structure a launch sequence that protects discretion while pressure testing interest — without stating a guaranteed sale price.`
      : `Build a go-to-market plan around ${priority} within your ${timeline.toLowerCase()} timeline. ${tenant.agentName} can advise on pricing posture, property presentation, and objections to anticipate.${objectionNote}`,
    positioningAngle: isPremium
      ? `Private market positioning should emphasize verified architectural and outdoor living strengths, the feature inventory, and privacy controls appropriate to a ${value} ${city} property. Presentation should support a property narrative grounded in documented upgrades — not broad demographic claims.`
      : `${city} market positioning should emphasize this ${condition} property through location, quality, and a clear ownership story grounded in verified features.`,
    prepRecommendations: prepRecs.slice(0, 5),
    readinessScore: readiness,
    recommendedNextStep: sellerRecommendedNextStep(data),
    questionsForJustin: isPremium
      ? [
          `What launch sequence fits a ${value} ${city} property when ${priority.toLowerCase()} is the priority?`,
          `Which property facts should be verified first to shape presentation and showing protocol?`,
          `How should controlled exposure and broker to broker previews be structured within my ${timeline.toLowerCase()} timeline?`,
          `What questions should we resolve in a confidential pricing review before any broader marketing?`,
        ]
      : [
          `How should I position this ${condition} property in ${city} within the ${value} range given my focus on ${priority}?`,
          `What prep steps would most improve buyer perception before launch?`,
          `Would a discreet or limited-exposure strategy fit my ${timeline.toLowerCase()} timeline?`,
          `What should I review first with ${tenant.agentName} before setting a marketing sequence?`,
        ],
    internalLeadSummary: `Seller: ${data.contact.firstName} ${data.contact.lastName}. ${city}, ${state}. Value: ${value}. Condition: ${condition}. Timeline: ${timeline}. Priority: ${priority}. Readiness: ${readiness}/100.${upgradesNote}${freeTextNote}`,
    suggestedFollowUpMessage: buildSellerFollowUpMessage(data, tenant),
  };
}

async function callBuyerOpenAi(
  data: BuyerQuizData,
  model: string
): Promise<BuyerAiReport> {
  const tenant = getDefaultTenant();
  const openai = getOpenAIClient();
  const response = await createStructuredChatCompletion(openai, {
    model,
    messages: [
      { role: "system", content: buildSystemMessage(tenant) },
      { role: "system", content: tenantifyPromptText(BUYER_INSTRUCTIONS, tenant) },
      {
        role: "user",
        content: `Create a personalized buyer report using this quiz data:\n${buildBuyerQuizContext(data)}`,
      },
    ],
    jsonSchema: {
      name: "buyer_report",
      strict: true,
      schema: buyerJsonSchema,
    },
    temperaturePreference: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  const parsed = buyerAiReportSchema.parse(JSON.parse(content));
  return postProcessBuyerReport(parsed, data);
}

export async function generateBuyerReport(
  data: BuyerQuizData
): Promise<GeneratedBuyerReport> {
  const start = Date.now();
  const { leadScore } = buildModelSelectionForBuyer(data);

  try {
    const attempt = await generateOpenAiReportWithModelOrder({
      leadType: "buyer",
      callModel: (modelName) => callBuyerOpenAi(data, modelName),
    });

    logReportSource("buyer", "openai");

    return {
      report: attempt.report,
      source: "openai",
      model: attempt.model,
      durationMs: Date.now() - start,
      leadScore,
      fallbackModelAttempted: attempt.fallbackModelAttempted,
      premiumModelFailed: attempt.premiumModelFailed,
      miniBackupModelFailed: attempt.miniBackupModelFailed,
      premiumModelFailedError: attempt.premiumModelFailedError,
      miniBackupModelFailedError: attempt.miniBackupModelFailedError,
    };
  } catch (error) {
    const errMsg = logFallbackError("buyer", error);
    const meta = getDeterministicFallbackMeta(error);
    logReportSource("buyer", "fallback");

    return {
      report: postProcessBuyerReport(buildFallbackBuyerReport(data), data),
      source: "fallback",
      model: DETERMINISTIC_FALLBACK_MODEL,
      durationMs: Date.now() - start,
      leadScore,
      fallbackModelAttempted: meta.fallbackModelAttempted,
      premiumModelFailed: meta.premiumModelFailed,
      miniBackupModelFailed: meta.miniBackupModelFailed,
      premiumModelFailedError: meta.premiumModelFailedError,
      miniBackupModelFailedError: meta.miniBackupModelFailedError,
      error: errMsg,
    };
  }
}

async function callSellerOpenAi(
  data: SellerQuizData,
  model: string,
  propertyIntelligence?: PropertyIntelligence | null
): Promise<SellerAiReport> {
  const tenant = getDefaultTenant();
  const openai = getOpenAIClient();
  const response = await createStructuredChatCompletion(openai, {
    model,
    messages: [
      { role: "system", content: buildSystemMessage(tenant) },
      {
        role: "system",
        content: tenantifyPromptText(buildSellerInstructions(data), tenant),
      },
      {
        role: "user",
        content: `Create a personalized seller report using this quiz data:\n${buildSellerReportPromptContext(data, propertyIntelligence)}`,
      },
    ],
    jsonSchema: {
      name: "seller_report",
      strict: true,
      schema: sellerJsonSchema,
    },
    temperaturePreference: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  const parsed = sellerAiReportSchema.parse(JSON.parse(content));
  return postProcessSellerReport(parsed, data, propertyIntelligence);
}

export async function generateSellerReport(
  data: SellerQuizData,
  propertyIntelligence?: PropertyIntelligence | null
): Promise<GeneratedSellerReport> {
  const start = Date.now();
  const { leadScore } = buildModelSelectionForSeller(data);

  try {
    const attempt = await generateOpenAiReportWithModelOrder({
      leadType: "seller",
      callModel: (modelName) =>
        callSellerOpenAi(data, modelName, propertyIntelligence),
    });

    logReportSource("seller", "openai");

    return {
      report: attempt.report,
      source: "openai",
      model: attempt.model,
      durationMs: Date.now() - start,
      leadScore,
      fallbackModelAttempted: attempt.fallbackModelAttempted,
      premiumModelFailed: attempt.premiumModelFailed,
      miniBackupModelFailed: attempt.miniBackupModelFailed,
      premiumModelFailedError: attempt.premiumModelFailedError,
      miniBackupModelFailedError: attempt.miniBackupModelFailedError,
    };
  } catch (error) {
    const errMsg = logFallbackError("seller", error);
    const meta = getDeterministicFallbackMeta(error);
    logReportSource("seller", "fallback");

    return {
      report: postProcessSellerReport(
        buildFallbackSellerReport(data, propertyIntelligence),
        data,
        propertyIntelligence
      ),
      source: "fallback",
      model: DETERMINISTIC_FALLBACK_MODEL,
      durationMs: Date.now() - start,
      leadScore,
      fallbackModelAttempted: meta.fallbackModelAttempted,
      premiumModelFailed: meta.premiumModelFailed,
      miniBackupModelFailed: meta.miniBackupModelFailed,
      premiumModelFailedError: meta.premiumModelFailedError,
      miniBackupModelFailedError: meta.miniBackupModelFailedError,
      error: errMsg,
    };
  }
}

export async function generateReport(
  input: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): Promise<GeneratedReport> {
  if (input.leadType === "buyer") {
    return generateBuyerReport(input);
  }
  if (input.leadType === "seller") {
    return generateSellerReport(input);
  }
  if (input.leadType === "equity") {
    return generateEquityReport(input);
  }
  return generateWealthForecastReport(input);
}
