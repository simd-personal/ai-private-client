import { createStructuredChatCompletion } from "@/lib/ai/buildOpenAIRequestOptions";
import {
  buildLeadConciergeFallback,
  type LeadConciergeInput,
} from "@/lib/ai/buildLeadConciergeFallback";
import {
  generateOpenAiReportWithModelOrder,
  getDeterministicFallbackMeta,
  getOpenAIClient,
} from "@/lib/ai/openai-report-client";
import { getFollowUpGreeting } from "@/lib/ai/report-labels";
import { DETERMINISTIC_FALLBACK_MODEL } from "@/lib/ai/selectReportModel";
import { leadConciergeSchema, sanitizeLeadConcierge, type LeadConcierge } from "@/lib/schemas/lead-concierge";
import type { ReportSource } from "@/lib/ai/report-labels";
import { getLockedDisplayAddress } from "@/lib/property/getLockedDisplayAddress";
import { postProcessSellerLeadConcierge } from "@/lib/seller/seller-address-phrasing";
import { isPremiumSellerValue } from "@/lib/seller/seller-tier";
import type { SellerQuizData } from "@/lib/schemas/quiz";
import {
  getDefaultTenant,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";

export interface GeneratedLeadConcierge {
  concierge: LeadConcierge;
  source: ReportSource;
  model: string;
}

function buildConciergeSystem(tenant: TenantConfig): string {
  return `You are an internal sales concierge for ${tenant.agentName} at ${tenant.brandName}.

Generate a practical follow-up kit for ${tenant.agentName} to convert the lead. This is admin-only — never shown to the lead directly as automated advice.

VOICE: Direct, actionable, professional. Write scripts ${tenant.agentName} can use on calls, SMS, and email.

RULES:
- Reference the lead's actual quiz inputs and score/temperature
- callOpener: 2–4 sentences ${tenant.agentName} can say on a first call
- smsFollowUp: under 320 characters, conversational
- emailFollowUp: 50–120 words, polished but not stiff
- objectionsToExpect: 3–5 realistic objections for this lead type
- recommendedFollowUpTimeline: specific (e.g. within 24 hours for hot leads)
- nextBestAction: one concrete action ${tenant.agentName} should take first
- If contact.firstName is Fixture, Test, Example, Demo, Sample, or empty, never use that name in callOpener, smsFollowUp, emailFollowUp, leadPriorityReason, recommendedFollowUpTimeline, or nextBestAction — use "Hi there," or neutral copy without a name
- Always write "pressure test the model" — never "pressure the model"
- Do not promise guaranteed outcomes, prices, or returns
- Do not give tax, legal, or investment advice — suggest CPA/lender coordination where relevant`;
}

const TYPE_FOCUS: Record<LeadConciergeInput["leadType"], string> = {
  buyer:
    "Focus on location, budget, property type, timeline, financing status, and tradeoffs.",
  seller:
    "Focus on launch sequence, presentation audit, controlled exposure, and seller motivation.",
  equity:
    "Focus on ownership years, gross equity, net proceeds range, timing concern, and seller-to-buyer sequence.",
  wealth_forecast:
    "Focus on purchase price, down payment, monthly carry, leverage posture, property use, liquidity situation, and CPA or lender coordination.",
};

const conciergeJsonSchema = {
  type: "object",
  properties: {
    leadPriorityReason: { type: "string" },
    callOpener: { type: "string" },
    smsFollowUp: { type: "string" },
    emailFollowUp: { type: "string" },
    objectionsToExpect: { type: "array", items: { type: "string" } },
    recommendedFollowUpTimeline: { type: "string" },
    nextBestAction: { type: "string" },
  },
  required: [
    "leadPriorityReason",
    "callOpener",
    "smsFollowUp",
    "emailFollowUp",
    "objectionsToExpect",
    "recommendedFollowUpTimeline",
    "nextBestAction",
  ],
  additionalProperties: false,
} as const;

function buildConciergeContext(input: LeadConciergeInput): string {
  const tenant = getDefaultTenant();
  const contact = input.quizData.contact;
  const sellerPremium =
    input.leadType === "seller" &&
    isPremiumSellerValue((input.quizData as SellerQuizData).estimatedValueRange);

  return JSON.stringify(
    {
      leadType: input.leadType,
      leadScore: input.leadScore,
      leadTemperature: input.leadTemperature,
      focus: TYPE_FOCUS[input.leadType],
      tenant: {
        slug: tenant.slug,
        brandName: tenant.brandName,
        agentName: tenant.agentName,
        serviceAreas: tenant.serviceAreas,
        supportedStates: tenant.supportedStates,
        disclaimerText: tenant.disclaimerText,
      },
      sellerPremiumGuidance: sellerPremium
        ? "Premium seller ($5M+): Write like a private advisor — confidential email tone, discreet call opener, launch conversation framing, questions to ask before discussing price. Avoid generic CRM script language, pricing leverage repetition, and buyer-profile framing."
        : null,
      sellerAddressGuidance:
        input.leadType === "seller"
          ? "Mention the property address at most once in the call opener OR email — not in every sentence. Prefer street + city only (no ZIP or USA). Do not start objections or SMS with 'For {address},'."
          : null,
      internalLeadSummary: input.internalLeadSummary ?? null,
      quizData: input.quizData,
      equityCalculations: input.equityCalculations ?? null,
      equityPropertyIntelligence: input.equityPropertyIntelligence ?? null,
      wealthCalculations: input.wealthCalculations ?? null,
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        preferredContactMethod: contact.preferredContactMethod,
        hasPhone: Boolean(contact.phone?.trim()),
      },
      greetingHint: getFollowUpGreeting(contact.firstName),
    },
    null,
    2
  );
}

function finalizeSellerConcierge(
  concierge: LeadConcierge,
  input: LeadConciergeInput
): LeadConcierge {
  if (input.leadType !== "seller") {
    return concierge;
  }
  const data = input.quizData as SellerQuizData;
  const locked = getLockedDisplayAddress(data.propertyAddress, null);
  return postProcessSellerLeadConcierge(
    concierge,
    locked.lockedDisplayAddress,
    data.propertyAddress.city
  );
}

async function callConciergeOpenAi(
  input: LeadConciergeInput,
  model: string
): Promise<LeadConcierge> {
  const tenant = getDefaultTenant();
  const openai = getOpenAIClient();
  const response = await createStructuredChatCompletion(openai, {
    model,
    messages: [
      { role: "system", content: buildConciergeSystem(tenant) },
      {
        role: "user",
        content: `Generate a lead concierge follow-up kit as JSON:\n${buildConciergeContext(input)}`,
      },
    ],
    jsonSchema: {
      name: "lead_concierge",
      strict: true,
      schema: conciergeJsonSchema,
    },
    temperaturePreference: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty concierge AI response");

  return leadConciergeSchema.parse(JSON.parse(content));
}

/**
 * Always returns a concierge kit. Uses OpenAI premium → mini → deterministic fallback.
 * Never throws — safe to call during lead save.
 */
export async function generateLeadConcierge(
  input: LeadConciergeInput
): Promise<GeneratedLeadConcierge> {
  try {
    const attempt = await generateOpenAiReportWithModelOrder({
      leadType: input.leadType,
      callModel: (modelName) => callConciergeOpenAi(input, modelName),
    });

    return {
      concierge: finalizeSellerConcierge(
        sanitizeLeadConcierge(attempt.report, input.quizData.contact.firstName),
        input
      ),
      source: "openai",
      model: attempt.model,
    };
  } catch (error) {
    getDeterministicFallbackMeta(error);
    if (
      process.env.NODE_ENV === "development" ||
      process.env.AI_TEST === "1"
    ) {
      console.log("[concierge] OpenAI failed, using deterministic fallback");
    }

    return {
      concierge: finalizeSellerConcierge(
        sanitizeLeadConcierge(
          buildLeadConciergeFallback(input),
          input.quizData.contact.firstName
        ),
        input
      ),
      source: "fallback",
      model: DETERMINISTIC_FALLBACK_MODEL,
    };
  }
}
