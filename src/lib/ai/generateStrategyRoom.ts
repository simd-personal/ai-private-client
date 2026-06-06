import { createStructuredChatCompletion } from "@/lib/ai/buildOpenAIRequestOptions";
import { buildStrategyRoomFallback } from "@/lib/ai/buildStrategyRoomFallback";
import { calculateDealReadiness } from "@/lib/ai/calculateDealReadiness";
import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import {
  generateOpenAiReportWithModelOrder,
  getDeterministicFallbackMeta,
  getOpenAIClient,
} from "@/lib/ai/openai-report-client";
import { DETERMINISTIC_FALLBACK_MODEL } from "@/lib/ai/selectReportModel";
import {
  aiStrategyRoomOutputSchema,
  type AiStrategyRoomOutput,
} from "@/lib/schemas/ai-strategy-room";
import {
  getDefaultTenant,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";
import type { ReportSource } from "@/lib/ai/report-labels";

export interface GeneratedStrategyRoom {
  output: AiStrategyRoomOutput;
  source: ReportSource;
  model: string;
  fallbackModelAttempted: boolean;
  premiumModelFailed: boolean;
  miniBackupModelFailed: boolean;
}

const strategyRoomJsonSchema = {
  type: "object",
  properties: {
    strategyRoom: {
      type: "object",
      properties: {
        situationSnapshot: { type: "string" },
        knownFacts: { type: "array", items: { type: "string" } },
        itemsToVerify: { type: "array", items: { type: "string" } },
        keyDecisionDrivers: { type: "array", items: { type: "string" } },
        complexityLevel: {
          type: "string",
          enum: ["low", "medium", "high", "very_high"],
        },
        primaryCoordinationNeed: { type: "string" },
      },
      required: [
        "situationSnapshot",
        "knownFacts",
        "itemsToVerify",
        "keyDecisionDrivers",
        "complexityLevel",
        "primaryCoordinationNeed",
      ],
      additionalProperties: false,
    },
    scenarioComparison: {
      type: "object",
      properties: {
        scenarios: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              potentialAdvantages: { type: "array", items: { type: "string" } },
              planningRisks: { type: "array", items: { type: "string" } },
              advisorReviewsNeeded: { type: "array", items: { type: "string" } },
              timingConsiderations: { type: "array", items: { type: "string" } },
              liquidityConsiderations: {
                type: "array",
                items: { type: "string" },
              },
              privacyConsiderations: {
                type: "array",
                items: { type: "string" },
              },
              nonAdviceSummary: { type: "string" },
            },
            required: [
              "id",
              "title",
              "description",
              "potentialAdvantages",
              "planningRisks",
              "advisorReviewsNeeded",
              "timingConsiderations",
              "liquidityConsiderations",
              "privacyConsiderations",
              "nonAdviceSummary",
            ],
            additionalProperties: false,
          },
        },
        overallScenarioNote: { type: "string" },
      },
      required: ["scenarios", "overallScenarioNote"],
      additionalProperties: false,
    },
    advisorCoordinationMap: {
      type: "object",
      properties: {
        advisors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              advisorType: {
                type: "string",
                enum: [
                  "real_estate_agent",
                  "wealth_advisor",
                  "CPA",
                  "attorney",
                  "lender_private_banker",
                  "family_office_director",
                  "other",
                ],
              },
              displayName: { type: "string" },
              roleInDecision: { type: "string" },
              topicsToReview: { type: "array", items: { type: "string" } },
              questionsToAsk: { type: "array", items: { type: "string" } },
              documentsOrInfoNeeded: {
                type: "array",
                items: { type: "string" },
              },
              urgency: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: [
              "advisorType",
              "displayName",
              "roleInDecision",
              "topicsToReview",
              "questionsToAsk",
              "documentsOrInfoNeeded",
              "urgency",
            ],
            additionalProperties: false,
          },
        },
        coordinationSequence: { type: "array", items: { type: "string" } },
        recommendedFirstConversation: { type: "string" },
      },
      required: [
        "advisors",
        "coordinationSequence",
        "recommendedFirstConversation",
      ],
      additionalProperties: false,
    },
    advisorSpecificBriefs: {
      type: "object",
      properties: {
        agentBrief: { $ref: "#/$defs/advisorBrief" },
        wealthAdvisorBrief: { $ref: "#/$defs/advisorBrief" },
        cpaBrief: { $ref: "#/$defs/advisorBrief" },
        attorneyBrief: { $ref: "#/$defs/advisorBrief" },
        lenderBrief: { $ref: "#/$defs/advisorBrief" },
        familyOfficeBrief: { $ref: "#/$defs/advisorBrief" },
      },
      required: [
        "agentBrief",
        "wealthAdvisorBrief",
        "cpaBrief",
        "attorneyBrief",
        "lenderBrief",
        "familyOfficeBrief",
      ],
      additionalProperties: false,
    },
    dealReadiness: {
      type: "object",
      properties: {
        readinessScore: { type: "number" },
        readinessLabel: {
          type: "string",
          enum: [
            "early_exploration",
            "planning_ready",
            "advisor_review_needed",
            "execution_ready",
          ],
        },
        scoreBreakdown: {
          type: "object",
          properties: {
            objectiveClarity: { type: "number" },
            timelineClarity: { type: "number" },
            financialContext: { type: "number" },
            advisorInvolvement: { type: "number" },
            privacyComplexity: { type: "number" },
            executionComplexity: { type: "number" },
          },
          required: [
            "objectiveClarity",
            "timelineClarity",
            "financialContext",
            "advisorInvolvement",
            "privacyComplexity",
            "executionComplexity",
          ],
          additionalProperties: false,
        },
        priorityReason: { type: "string" },
        nextBestAction: { type: "string" },
      },
      required: [
        "readinessScore",
        "readinessLabel",
        "scoreBreakdown",
        "priorityReason",
        "nextBestAction",
      ],
      additionalProperties: false,
    },
    relationshipIntelligenceMap: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              type: { type: "string" },
            },
            required: ["id", "label", "type"],
            additionalProperties: false,
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationship: { type: "string" },
              coordinationNeed: { type: "string" },
            },
            required: ["from", "to", "relationship", "coordinationNeed"],
            additionalProperties: false,
          },
        },
        summary: { type: "string" },
      },
      required: ["nodes", "edges", "summary"],
      additionalProperties: false,
    },
    meetingPrepPack: {
      type: "object",
      properties: {
        callOpener: { type: "string" },
        discoveryQuestions: { type: "array", items: { type: "string" } },
        likelyObjections: { type: "array", items: { type: "string" } },
        suggestedResponses: { type: "array", items: { type: "string" } },
        meetingAgenda: { type: "array", items: { type: "string" } },
        documentsToRequest: { type: "array", items: { type: "string" } },
        recommendedFollowUpTimeline: { type: "string" },
      },
      required: [
        "callOpener",
        "discoveryQuestions",
        "likelyObjections",
        "suggestedResponses",
        "meetingAgenda",
        "documentsToRequest",
        "recommendedFollowUpTimeline",
      ],
      additionalProperties: false,
    },
    whiteGloveFollowUp: {
      type: "object",
      properties: {
        smsFollowUp: { type: "string" },
        emailSubject: { type: "string" },
        emailBody: { type: "string" },
        advisorIntroEmail: { type: "string" },
        internalTeamNote: { type: "string" },
      },
      required: [
        "smsFollowUp",
        "emailSubject",
        "emailBody",
        "advisorIntroEmail",
        "internalTeamNote",
      ],
      additionalProperties: false,
    },
    redFlagsAndMissingInfo: {
      type: "object",
      properties: {
        missingInformation: { type: "array", items: { type: "string" } },
        planningFlags: { type: "array", items: { type: "string" } },
        complexityFlags: { type: "array", items: { type: "string" } },
        riskLanguage: {
          type: "object",
          properties: {
            label: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["label", "explanation"],
          additionalProperties: false,
        },
        itemsToClarifyBeforeExecution: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "missingInformation",
        "planningFlags",
        "complexityFlags",
        "riskLanguage",
        "itemsToClarifyBeforeExecution",
      ],
      additionalProperties: false,
    },
    presentationMode: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slideNumber: { type: "number" },
              title: { type: "string" },
              subtitle: { type: "string" },
              bullets: { type: "array", items: { type: "string" } },
              speakerNote: { type: "string" },
            },
            required: [
              "slideNumber",
              "title",
              "subtitle",
              "bullets",
              "speakerNote",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["slides"],
      additionalProperties: false,
    },
  },
  required: [
    "strategyRoom",
    "scenarioComparison",
    "advisorCoordinationMap",
    "advisorSpecificBriefs",
    "dealReadiness",
    "relationshipIntelligenceMap",
    "meetingPrepPack",
    "whiteGloveFollowUp",
    "redFlagsAndMissingInfo",
    "presentationMode",
  ],
  additionalProperties: false,
  $defs: {
    advisorBrief: {
      type: "object",
      properties: {
        headline: { type: "string" },
        contextSummary: { type: "string" },
        planningTopics: { type: "array", items: { type: "string" } },
        questionsToAsk: { type: "array", items: { type: "string" } },
        documentsToRequest: { type: "array", items: { type: "string" } },
        coordinationNotes: { type: "string" },
        nonAdviceDisclaimer: { type: "string" },
      },
      required: [
        "headline",
        "contextSummary",
        "planningTopics",
        "questionsToAsk",
        "documentsToRequest",
        "coordinationNotes",
        "nonAdviceDisclaimer",
      ],
      additionalProperties: false,
    },
  },
} as const;

function buildStrategyRoomSystemPrompt(tenant: TenantConfig): string {
  return `You are a private client real estate planning coordinator preparing an executive-level decision brief for advisor review at ${tenant.brandName}.

ROLE: Planning and coordination layer — NOT a licensed advisor giving professional advice.

YOU ARE:
- A private client planning coordinator assembling a decision brief
- Concise, specific, premium in tone
- Focused on coordination, sequencing, and items to verify

YOU ARE NOT:
- A realtor giving valuation advice
- A CPA giving tax advice
- An attorney giving legal advice
- A lender giving lending approval
- A financial advisor giving investment advice

COMPLIANCE — strictly follow:
- Use only provided intake facts; clearly separate known facts from items to verify
- Use safe wording: planning topic, advisor review, CPA review, attorney review, lender/private banker review, wealth advisor review, licensed agent review, private decision brief, coordination checklist, scenario for discussion, items to verify
- Avoid "you should" for tax/legal/financial decisions
- No exact valuations, price guarantees, or lending approval promises
- No schools, safety, crime, demographics, protected classes, or neighborhood recommendations
- Frame scenarios as "for discussion" with nonAdviceSummary on each
- dealReadiness is admin-only intelligence — still generate it accurately
- presentationMode: 8 slides with speaker notes for internal use

Generate 3 scenario comparisons typical for complex real estate decisions (e.g., sell first/buy first/hold and acquire) tailored to the intake.

VOICE: Executive advisory memo — polished, calm, strategic.`;
}

function normalizeStrategyRoomOutput(
  raw: unknown,
  ctx: PrivateClientIntakeContext,
  tenant: TenantConfig
): AiStrategyRoomOutput {
  const parsed = aiStrategyRoomOutputSchema.safeParse(raw);
  if (parsed.success) {
    const deterministicReadiness = calculateDealReadiness(ctx);
    return {
      ...parsed.data,
      dealReadiness: deterministicReadiness,
    };
  }

  console.warn("[strategy-room] AI output malformed, using fallback merge");
  const fallback = buildStrategyRoomFallback(ctx, tenant);
  return fallback;
}

export async function generateStrategyRoom(
  ctx: PrivateClientIntakeContext,
  tenant: TenantConfig = getDefaultTenant()
): Promise<GeneratedStrategyRoom> {
  const openai = getOpenAIClient();
  const systemPrompt = buildStrategyRoomSystemPrompt(tenant);
  const userContent = JSON.stringify({ intake: ctx, tenant: { agentName: tenant.agentName, brandName: tenant.brandName } });

  try {
    const result = await generateOpenAiReportWithModelOrder({
      leadType: "equity",
      callModel: async (model) => {
        const completion = await createStructuredChatCompletion(openai, {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          jsonSchema: {
            name: "strategy_room_output",
            strict: true,
            schema: strategyRoomJsonSchema as unknown as Record<string, unknown>,
          },
          temperaturePreference: 0.4,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty OpenAI response");
        return normalizeStrategyRoomOutput(JSON.parse(content), ctx, tenant);
      },
    });

    return {
      output: result.report,
      source: "openai",
      model: result.model,
      fallbackModelAttempted: result.fallbackModelAttempted,
      premiumModelFailed: result.premiumModelFailed,
      miniBackupModelFailed: result.miniBackupModelFailed,
    };
  } catch (error) {
    getDeterministicFallbackMeta(error);
    console.error("[strategy-room] OpenAI failed, using deterministic fallback:", error);
    return {
      output: buildStrategyRoomFallback(ctx, tenant),
      source: "fallback",
      model: DETERMINISTIC_FALLBACK_MODEL,
      fallbackModelAttempted: true,
      premiumModelFailed: true,
      miniBackupModelFailed: true,
    };
  }
}

export function strategyRoomToDbColumns(output: AiStrategyRoomOutput, meta: {
  source: string;
  model: string;
}) {
  return {
    ai_strategy_room: output.strategyRoom,
    ai_scenario_comparison: output.scenarioComparison,
    ai_advisor_coordination_map: output.advisorCoordinationMap,
    ai_advisor_specific_briefs: output.advisorSpecificBriefs,
    ai_deal_readiness: output.dealReadiness,
    ai_relationship_map: output.relationshipIntelligenceMap,
    ai_meeting_prep_pack: output.meetingPrepPack,
    ai_white_glove_follow_up: output.whiteGloveFollowUp,
    ai_red_flags_missing_info: output.redFlagsAndMissingInfo,
    ai_presentation_mode: output.presentationMode,
    ai_demo_version: "strategy-room-v1",
    ai_generated_at: new Date().toISOString(),
    ai_generation_source: meta.source,
    ai_generation_model: meta.model,
  };
}
