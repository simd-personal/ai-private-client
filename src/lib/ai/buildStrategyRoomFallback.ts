import { calculateDealReadiness } from "@/lib/ai/calculateDealReadiness";
import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import type {
  AdvisorBrief,
  AdvisorSpecificBriefs,
  AiStrategyRoomOutput,
} from "@/lib/schemas/ai-strategy-room";
import type { TenantConfig } from "@/lib/tenants/tenant-config";

function buildAdvisorBrief(
  headline: string,
  ctx: PrivateClientIntakeContext,
  topics: string[],
  tenant: TenantConfig
): AdvisorBrief {
  return {
    headline,
    contextSummary: `${ctx.clientName}'s planning context: ${ctx.objective}. Timeline: ${ctx.timeline ?? "to be confirmed"}.`,
    planningTopics: topics,
    questionsToAsk: [
      "What items should be verified before any execution step?",
      "What sequencing considerations apply to this objective?",
      "What documents or information are needed for your review?",
    ],
    documentsToRequest: [
      "Ownership documentation (if applicable)",
      "Recent financial statements for planning context",
      "Existing advisory agreements or trust documents (if applicable)",
    ],
    coordinationNotes: `Coordinate with ${tenant.agentName} and other advisors before any execution decisions.`,
    nonAdviceDisclaimer:
      "This brief is for planning coordination only — not tax, legal, lending, or investment advice.",
  };
}

export function buildStrategyRoomFallback(
  ctx: PrivateClientIntakeContext,
  tenant: TenantConfig
): AiStrategyRoomOutput {
  const dealReadiness = calculateDealReadiness(ctx);
  const current = ctx.currentProperty ?? "current property";
  const target = ctx.targetMarket ?? "target market";

  const strategyRoom = {
    situationSnapshot: `${ctx.clientName} is evaluating a complex real estate planning scenario: ${ctx.objective}. This private decision brief organizes known facts, items to verify, and advisor coordination topics for review — not execution advice.`,
    knownFacts: [
      ctx.objective,
      ctx.timeline ? `Timeline: ${ctx.timeline}` : "Timeline: to be confirmed",
      ctx.financingContext
        ? `Financing context: ${ctx.financingContext}`
        : "Financing context: to be verified",
      ctx.privacyLevel
        ? `Privacy preference: ${ctx.privacyLevel}`
        : "Privacy preference: to be confirmed",
    ].filter(Boolean),
    itemsToVerify: [
      "Confirmed ownership structure and title vesting",
      "Net proceeds range and liquidity timing (CPA/advisor review)",
      "Financing capacity and lender pre-qualification status",
      "Privacy constraints for marketing and showings",
      "Target property criteria and acquisition timeline",
    ],
    keyDecisionDrivers: [
      "Sequencing sell vs. buy",
      "Liquidity and financing coordination",
      "Privacy-first execution requirements",
      "Advisor review timing",
    ],
    complexityLevel:
      ctx.privacyLevel?.includes("high") || ctx.ownershipStructure
        ? ("very_high" as const)
        : ("high" as const),
    primaryCoordinationNeed:
      "Align licensed agent, CPA, attorney, and lender/private banker reviews before execution planning.",
  };

  const scenarioComparison = {
    scenarios: [
      {
        id: "sell_then_buy",
        title: "Sell First, Then Acquire",
        description: `Complete the sale of ${current} before pursuing ${target}.`,
        potentialAdvantages: [
          "Clarity on net proceeds before committing to acquisition",
          "Reduced dual-property carrying risk",
          "Simpler financing picture for lender review",
        ],
        planningRisks: [
          "Interim housing and timing gap",
          "Market availability in target market during transition",
        ],
        advisorReviewsNeeded: ["CPA review", "Lender/private banker review", "Licensed agent review"],
        timingConsiderations: ["Sale timeline vs. target acquisition window"],
        liquidityConsiderations: ["Proceeds deployment timing", "Bridge financing if needed"],
        privacyConsiderations: ["Discreet listing approach if privacy is high"],
        nonAdviceSummary:
          "A scenario for discussion — not a recommendation. Advisor review required.",
      },
      {
        id: "buy_then_sell",
        title: "Acquire Target, Then Sell Current",
        description: `Secure ${target} before completing sale of ${current}.`,
        potentialAdvantages: [
          "Locks target property before sale completes",
          "May suit strong liquidity position",
        ],
        planningRisks: [
          "Dual carrying costs during overlap",
          "Financing complexity requiring lender review",
        ],
        advisorReviewsNeeded: ["Lender/private banker review", "Wealth advisor review", "CPA review"],
        timingConsiderations: ["Overlap period planning", "Contingency structures to verify with attorney"],
        liquidityConsiderations: ["Bridge or portfolio liquidity deployment"],
        privacyConsiderations: ["Confidential acquisition search if required"],
        nonAdviceSummary:
          "A scenario for discussion — verify capacity and structure with advisors.",
      },
      {
        id: "hold_and_acquire",
        title: "Hold Current Property and Acquire Target",
        description: `Retain ${current} while adding ${target} — portfolio expansion scenario.`,
        potentialAdvantages: [
          "Preserves existing property exposure",
          "Flexibility for future disposition timing",
        ],
        planningRisks: [
          "Increased portfolio complexity",
          "Higher liquidity and financing requirements",
        ],
        advisorReviewsNeeded: ["Wealth advisor review", "CPA review", "Lender/private banker review"],
        timingConsiderations: ["Long-term hold vs. eventual sale timing"],
        liquidityConsiderations: ["Portfolio allocation and debt capacity"],
        privacyConsiderations: ["Multiple property privacy management"],
        nonAdviceSummary:
          "A scenario for discussion — wealth and lending reviews essential.",
      },
    ],
    overallScenarioNote:
      "Each scenario requires advisor review before execution. Sequencing should be confirmed with CPA, attorney, lender, and licensed agent — not decided from this brief alone.",
  };

  const advisors = [
    {
      advisorType: "real_estate_agent" as const,
      displayName: "Licensed Agent",
      roleInDecision: "Coordinate listing/acquisition strategy and privacy-first execution",
      topicsToReview: ["Market sequencing", "Discreet marketing approach", "Target property search criteria"],
      questionsToAsk: [
        "What listing or acquisition approach supports privacy requirements?",
        "What timeline is realistic for both markets?",
      ],
      documentsOrInfoNeeded: ["Property details", "Target criteria", "Privacy preferences"],
      urgency: "high" as const,
    },
    {
      advisorType: "CPA" as const,
      displayName: "CPA",
      roleInDecision: "Review planning topics related to proceeds and timing",
      topicsToReview: ["Net proceeds planning", "Timing considerations", "Items to verify"],
      questionsToAsk: [
        "What planning topics should be reviewed before listing or acquiring?",
        "What documentation is needed for your review?",
      ],
      documentsOrInfoNeeded: ["Cost basis documentation", "Improvement records", "Prior sale history"],
      urgency: "high" as const,
    },
    {
      advisorType: "attorney" as const,
      displayName: "Attorney",
      roleInDecision: "Review ownership structure and transaction structure",
      topicsToReview: [
        ctx.ownershipStructure ?? "Ownership structure verification",
        "Trust or entity considerations",
        "Contract contingencies",
      ],
      questionsToAsk: [
        "Does current ownership structure affect sequencing options?",
        "What items require attorney review before execution?",
      ],
      documentsOrInfoNeeded: ["Trust or entity documents", "Title vesting information"],
      urgency: ctx.legalReviewNeeded ? ("high" as const) : ("medium" as const),
    },
    {
      advisorType: "lender_private_banker" as const,
      displayName: "Lender / Private Banker",
      roleInDecision: "Review financing capacity and bridge options",
      topicsToReview: ["Partial financing capacity", "Bridge financing options", "Liquidity deployment"],
      questionsToAsk: [
        "What financing structures should be reviewed for each scenario?",
        "What pre-qualification is needed before acquisition search?",
      ],
      documentsOrInfoNeeded: ["Financial statements", "Existing loan documentation"],
      urgency: ctx.lenderReviewNeeded ? ("high" as const) : ("medium" as const),
    },
    {
      advisorType: "wealth_advisor" as const,
      displayName: "Wealth Advisor",
      roleInDecision: "Review portfolio impact and liquidity allocation",
      topicsToReview: ["Portfolio allocation", "Liquidity planning", "Scenario impact"],
      questionsToAsk: [
        "How does each scenario affect overall portfolio positioning?",
        "What liquidity reserves should be maintained?",
      ],
      documentsOrInfoNeeded: ["Portfolio summary", "Liquidity schedule"],
      urgency: "medium" as const,
    },
  ];

  const advisorCoordinationMap = {
    advisors,
    coordinationSequence: [
      "Confirm objective, timeline, and items to verify",
      "CPA and attorney review of ownership and planning topics",
      "Lender/private banker review of financing capacity",
      "Licensed agent coordination on sequencing and privacy approach",
      "Wealth advisor review of portfolio impact",
    ],
    recommendedFirstConversation:
      "Begin with CPA and attorney review to confirm ownership structure and planning topics before market execution.",
  };

  const advisorSpecificBriefs: AdvisorSpecificBriefs = {
    agentBrief: buildAdvisorBrief(
      "Licensed Agent Coordination Brief",
      ctx,
      ["Sequencing strategy", "Privacy-first listing/acquisition", "Target property criteria"],
      tenant
    ),
    wealthAdvisorBrief: buildAdvisorBrief(
      "Wealth Advisor Review Brief",
      ctx,
      ["Portfolio impact", "Liquidity allocation", "Scenario comparison for discussion"],
      tenant
    ),
    cpaBrief: buildAdvisorBrief(
      "CPA Planning Topics Brief",
      ctx,
      ["Net proceeds planning topics", "Timing considerations", "Items to verify"],
      tenant
    ),
    attorneyBrief: buildAdvisorBrief(
      "Attorney Review Brief",
      ctx,
      ["Ownership structure", "Trust/entity considerations", "Contract contingencies"],
      tenant
    ),
    lenderBrief: buildAdvisorBrief(
      "Lender / Private Banker Review Brief",
      ctx,
      ["Financing capacity", "Bridge options", "Partial financing structures"],
      tenant
    ),
    familyOfficeBrief: buildAdvisorBrief(
      "Family Office Coordination Brief",
      ctx,
      ["Multi-advisor sequencing", "Privacy protocol", "Execution governance"],
      tenant
    ),
  };

  const relationshipIntelligenceMap = {
    nodes: [
      { id: "client", label: ctx.clientName, type: "client" },
      { id: "agent", label: tenant.agentName, type: "real_estate_agent" },
      { id: "cpa", label: "CPA", type: "CPA" },
      { id: "attorney", label: "Attorney", type: "attorney" },
      { id: "lender", label: "Lender / Private Banker", type: "lender_private_banker" },
      { id: "wealth", label: "Wealth Advisor", type: "wealth_advisor" },
    ],
    edges: [
      { from: "client", to: "agent", relationship: "Planning coordination", coordinationNeed: "Sequencing and privacy approach" },
      { from: "client", to: "cpa", relationship: "Planning review", coordinationNeed: "Proceeds and timing topics" },
      { from: "client", to: "attorney", relationship: "Structure review", coordinationNeed: "Ownership and contingencies" },
      { from: "client", to: "lender", relationship: "Financing review", coordinationNeed: "Capacity and bridge options" },
      { from: "client", to: "wealth", relationship: "Portfolio review", coordinationNeed: "Liquidity and allocation" },
      { from: "agent", to: "cpa", relationship: "Cross-advisor", coordinationNeed: "Timing alignment" },
      { from: "agent", to: "lender", relationship: "Cross-advisor", coordinationNeed: "Financing pre-qualification" },
    ],
    summary:
      "This relationship map illustrates coordination needs between the client and advisory team. It is for planning discussion — not a recommendation on advisor selection.",
  };

  const meetingPrepPack = {
    callOpener: `Thank you for sharing your planning context. I'd like to walk through the private decision brief, confirm known facts, and identify items to verify with your advisory team before any execution steps.`,
    discoveryQuestions: [
      "What is the confirmed timeline for both the sale and acquisition?",
      "Which advisors are already engaged, and who should join the coordination call?",
      "What privacy constraints should guide marketing and search activity?",
      "What ownership structure considerations require attorney review?",
      "What financing capacity has been reviewed with your lender or private banker?",
    ],
    likelyObjections: [
      "We want to move faster than the advisor review timeline suggests.",
      "We are concerned about losing the target property while selling.",
      "We prefer to keep the process fully confidential.",
    ],
    suggestedResponses: [
      "The sequencing can be pressure-tested with your advisors while maintaining momentum — let's identify which reviews can run in parallel.",
      "Your licensed agent can explore discreet acquisition options while advisor reviews proceed — subject to financing verification.",
      "Privacy-first protocols can be built into both listing and search — let's confirm specifics with your team.",
    ],
    meetingAgenda: [
      "Review situation snapshot and known facts",
      "Walk through scenario comparison for discussion",
      "Confirm advisor coordination sequence",
      "Identify items to clarify before execution",
      "Agree on next coordination steps",
    ],
    documentsToRequest: [
      "Ownership and title documentation",
      "Recent financial statements",
      "Existing advisory agreements",
      "Target property criteria summary",
    ],
    recommendedFollowUpTimeline:
      "Schedule advisor coordination within 5–7 business days while intake items are confirmed.",
  };

  const whiteGloveFollowUp = {
    smsFollowUp: `Hi${ctx.clientName !== "Client" ? ` ${ctx.clientName.split(" ")[0]}` : ""} — your Private Client Property Desk brief is ready. It outlines planning topics and advisor coordination for your review. Would you like to schedule a coordination call this week?`,
    emailSubject: "Your Private Client Decision Brief — Planning Topics for Review",
    emailBody: `Thank you for completing the Private Client Property Brief. Your decision brief outlines known facts, scenarios for discussion, and advisor coordination topics — prepared for review with your CPA, attorney, lender, and wealth advisor.\n\nThis is a planning document, not tax, legal, lending, or investment advice. ${tenant.agentName} is available to coordinate the next conversation at your convenience.`,
    advisorIntroEmail: `I'm coordinating a complex real estate planning scenario for ${ctx.clientName}: ${ctx.objective}. A private decision brief has been prepared outlining scenarios for discussion and items to verify. I'd welcome your review of the planning topics relevant to your role before any execution steps.`,
    internalTeamNote: `Lead requires multi-advisor coordination. Priority: confirm ownership structure, financing capacity, and privacy protocol. Readiness score: ${dealReadiness.readinessScore}. Next: schedule advisor coordination call.`,
  };

  const redFlagsAndMissingInfo = {
    missingInformation: [
      !ctx.ownershipStructure ? "Ownership structure not confirmed" : null,
      !ctx.financingContext ? "Financing capacity not documented" : null,
      "Target property criteria need refinement",
      "Confirmed net proceeds range pending CPA review",
    ].filter(Boolean) as string[],
    planningFlags: [
      "Multi-market sequencing complexity",
      ctx.privacyLevel?.includes("high") ? "High privacy execution requirements" : null,
      "Partial financing adds coordination complexity",
    ].filter(Boolean) as string[],
    complexityFlags: [
      "Sell-and-buy sequencing across markets",
      ctx.ownershipStructure ? "Trust or entity ownership to verify" : null,
    ].filter(Boolean) as string[],
    riskLanguage: {
      label: "Planning Complexity — Advisor Review Required",
      explanation:
        "This scenario involves multiple markets, partial financing, and privacy considerations. Execution should not proceed until advisor reviews are complete.",
    },
    itemsToClarifyBeforeExecution: [
      "Confirmed ownership structure and title vesting",
      "Advisor roster and coordination schedule",
      "Financing pre-qualification status",
      "Privacy protocol for listing and acquisition",
      "Target property criteria and timeline",
    ],
  };

  const presentationMode = {
    slides: [
      {
        slideNumber: 1,
        title: "Client Objective",
        subtitle: ctx.objective,
        bullets: [ctx.timeline ? `Timeline: ${ctx.timeline}` : "Timeline: to be confirmed", ctx.financingContext ?? "Financing: to be verified"],
        speakerNote: "Open with the client's stated objective. Confirm accuracy before proceeding.",
      },
      {
        slideNumber: 2,
        title: "Situation Snapshot",
        subtitle: "Known facts and planning context",
        bullets: strategyRoom.knownFacts.slice(0, 4),
        speakerNote: "Separate known facts from items still to verify.",
      },
      {
        slideNumber: 3,
        title: "Scenario Comparison",
        subtitle: "Scenarios for discussion — not recommendations",
        bullets: scenarioComparison.scenarios.map((s) => s.title),
        speakerNote: "Present each scenario as a discussion item requiring advisor review.",
      },
      {
        slideNumber: 4,
        title: "Advisor Coordination Map",
        subtitle: "Recommended review sequence",
        bullets: advisorCoordinationMap.coordinationSequence.slice(0, 4),
        speakerNote: "Emphasize coordination — not advice from any single role.",
      },
      {
        slideNumber: 5,
        title: "Key Planning Topics",
        subtitle: "Topics for advisor review",
        bullets: strategyRoom.keyDecisionDrivers,
        speakerNote: "Frame as planning topics, not decisions.",
      },
      {
        slideNumber: 6,
        title: "Items to Verify",
        subtitle: "Before execution planning",
        bullets: redFlagsAndMissingInfo.itemsToClarifyBeforeExecution.slice(0, 5),
        speakerNote: "These must be resolved before execution conversations.",
      },
      {
        slideNumber: 7,
        title: "Recommended Next Step",
        subtitle: dealReadiness.nextBestAction,
        bullets: [advisorCoordinationMap.recommendedFirstConversation],
        speakerNote: "Close with a clear coordination action — not an execution directive.",
      },
      {
        slideNumber: 8,
        title: "Meeting Prep & Follow-Up",
        subtitle: "Internal coordination",
        bullets: meetingPrepPack.meetingAgenda.slice(0, 4),
        speakerNote: "Internal slide — meeting agenda and follow-up timeline.",
      },
    ],
  };

  return {
    strategyRoom,
    scenarioComparison,
    advisorCoordinationMap,
    advisorSpecificBriefs,
    dealReadiness,
    relationshipIntelligenceMap,
    meetingPrepPack,
    whiteGloveFollowUp,
    redFlagsAndMissingInfo,
    presentationMode,
  };
}
