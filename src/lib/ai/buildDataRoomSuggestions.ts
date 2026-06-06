import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import type { AiStrategyRoomOutput } from "@/lib/schemas/ai-strategy-room";
import {
  DATA_ROOM_CATEGORIES,
  type DataRoomSuggestions,
} from "@/lib/schemas/decision-layer";

interface SuggestionTemplate {
  category: (typeof DATA_ROOM_CATEGORIES)[number];
  itemName: string;
  description: string;
  requestedFrom: string;
  advisorOwner: string;
  priority: "low" | "medium" | "high";
  visibility: "public" | "admin";
  when?: (ctx: PrivateClientIntakeContext) => boolean;
}

const TEMPLATES: SuggestionTemplate[] = [
  {
    category: "Property Documents",
    itemName: "Current property address confirmation",
    description: "Verify the property address and ownership context.",
    requestedFrom: "Client",
    advisorOwner: "Licensed Agent",
    priority: "high",
    visibility: "public",
    when: (ctx) => Boolean(ctx.currentProperty),
  },
  {
    category: "Property Documents",
    itemName: "Mortgage statement",
    description: "May help lending and equity planning discussions.",
    requestedFrom: "Client",
    advisorOwner: "Lender / Private Banker",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.lenderReviewNeeded,
  },
  {
    category: "Property Documents",
    itemName: "Title or vesting information",
    description: "Ownership structure context for advisor review.",
    requestedFrom: "Client",
    advisorOwner: "Attorney",
    priority: "high",
    visibility: "admin",
    when: (ctx) => ctx.legalReviewNeeded || Boolean(ctx.ownershipStructure),
  },
  {
    category: "Tax / CPA Review",
    itemName: "Estimated cost basis",
    description: "Planning topic for CPA review — not tax advice.",
    requestedFrom: "Client",
    advisorOwner: "CPA",
    priority: "high",
    visibility: "admin",
    when: (ctx) => ctx.taxReviewNeeded,
  },
  {
    category: "Tax / CPA Review",
    itemName: "Capital improvement records",
    description: "May inform CPA planning topics if provided by client.",
    requestedFrom: "Client",
    advisorOwner: "CPA",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.taxReviewNeeded,
  },
  {
    category: "Tax / CPA Review",
    itemName: "1031 exchange timing question",
    description: "Item to verify with CPA — scenario for discussion only.",
    requestedFrom: "Client",
    advisorOwner: "CPA",
    priority: "medium",
    visibility: "admin",
    when: (ctx) =>
      ctx.leadType === "equity" || ctx.leadType === "seller",
  },
  {
    category: "Legal / Entity Review",
    itemName: "Trust ownership confirmation",
    description: "Entity context for attorney review.",
    requestedFrom: "Client",
    advisorOwner: "Attorney",
    priority: "high",
    visibility: "admin",
    when: (ctx) => ctx.legalReviewNeeded,
  },
  {
    category: "Legal / Entity Review",
    itemName: "LLC/entity documents",
    description: "Ownership structure materials for attorney review.",
    requestedFrom: "Client",
    advisorOwner: "Attorney",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.legalReviewNeeded,
  },
  {
    category: "Lending / Private Banking Review",
    itemName: "Desired financing structure",
    description: "Planning topic for lender or private banker review.",
    requestedFrom: "Client",
    advisorOwner: "Lender / Private Banker",
    priority: "high",
    visibility: "admin",
    when: (ctx) => ctx.lenderReviewNeeded,
  },
  {
    category: "Lending / Private Banking Review",
    itemName: "Liquidity available",
    description: "Context for financing scenario discussions.",
    requestedFrom: "Client",
    advisorOwner: "Lender / Private Banker",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.lenderReviewNeeded,
  },
  {
    category: "Wealth Advisor Review",
    itemName: "Liquidity event context",
    description: "Broader wealth planning context for advisor review.",
    requestedFrom: "Client",
    advisorOwner: "Wealth Advisor",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.wealthReviewNeeded,
  },
  {
    category: "Wealth Advisor Review",
    itemName: "Portfolio concentration considerations",
    description: "Planning topic — not investment advice.",
    requestedFrom: "Client",
    advisorOwner: "Wealth Advisor",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.wealthReviewNeeded,
  },
  {
    category: "Privacy / Execution",
    itemName: "Public listing comfort",
    description: "Privacy preference for execution planning.",
    requestedFrom: "Client",
    advisorOwner: "Licensed Agent",
    priority: "medium",
    visibility: "public",
    when: (ctx) =>
      ctx.leadType === "seller" || Boolean(ctx.privacyLevel),
  },
  {
    category: "Privacy / Execution",
    itemName: "Off-market/private sale preference",
    description: "Execution protocol for advisor coordination.",
    requestedFrom: "Client",
    advisorOwner: "Licensed Agent",
    priority: "medium",
    visibility: "public",
    when: (ctx) => Boolean(ctx.privacyLevel),
  },
  {
    category: "Family Office / Governance",
    itemName: "Decision-maker confirmation",
    description: "Family governance context for coordination.",
    requestedFrom: "Client",
    advisorOwner: "Family Office Director",
    priority: "medium",
    visibility: "admin",
    when: (ctx) => ctx.advisorsInvolved.includes("family office"),
  },
];

export function buildDataRoomSuggestions(
  ctx: PrivateClientIntakeContext,
  output: AiStrategyRoomOutput
): DataRoomSuggestions {
  const items = TEMPLATES.filter((t) => !t.when || t.when(ctx)).map((t) => ({
    category: t.category,
    itemName: t.itemName,
    description: t.description,
    requestedFrom: t.requestedFrom,
    advisorOwner: t.advisorOwner,
    priority: t.priority,
    visibility: t.visibility,
    aiReason: `Suggested based on ${ctx.objective.slice(0, 80)}`,
  }));

  output.meetingPrepPack.documentsToRequest.forEach((doc) => {
    if (items.some((i) => i.itemName.toLowerCase() === doc.toLowerCase())) return;
    items.push({
      category: "Property Documents",
      itemName: doc,
      description: "Identified during meeting prep planning.",
      requestedFrom: "Client",
      advisorOwner: "Licensed Agent",
      priority: "medium",
      visibility: "admin",
      aiReason: "From meeting prep document list",
    });
  });

  output.advisorCoordinationMap.advisors.forEach((advisor) => {
    advisor.documentsOrInfoNeeded.slice(0, 2).forEach((doc) => {
      if (items.some((i) => i.itemName.toLowerCase() === doc.toLowerCase()))
        return;
      items.push({
        category: "Wealth Advisor Review",
        itemName: doc,
        description: `Requested for ${advisor.displayName} review.`,
        requestedFrom: "Client",
        advisorOwner: advisor.displayName,
        priority: advisor.urgency,
        visibility: "admin",
        aiReason: `Advisor coordination: ${advisor.roleInDecision}`,
      });
    });
  });

  return {
    items,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeDataRoomKey(category: string, itemName: string): string {
  return `${category.trim().toLowerCase()}::${itemName.trim().toLowerCase()}`;
}
