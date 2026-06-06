import type { DecisionGraph } from "@/lib/schemas/decision-layer";

export type DecisionMapNode = DecisionGraph["nodes"][number];

export const DECISION_MAP_STAGE_LABELS: Record<
  DecisionGraph["decisionStage"],
  string
> = {
  exploration: "Exploration",
  planning: "Planning",
  advisor_review: "Advisor Review",
  execution_preparation: "Execution Preparation",
};

export function sanitizePublicDecisionText(text: string): string {
  if (!text.trim()) return text;

  let result = text.replace(
    /\b[A-Z][a-z]+(?:\s+(?:[A-Z]\.?|[A-Z][a-z]+))+\s+(?=is|was|has|seeks|wants|plans|needs|intends|currently|may|will)\b/g,
    "The client "
  );
  result = result.replace(
    /\b[A-Z][a-z]+(?:\s+(?:[A-Z]\.?|[A-Z][a-z]+))+'s\b/g,
    "The client's"
  );
  return result.replace(/\s{2,}/g, " ").trim();
}

export interface DecisionMapColumns {
  knownFacts: DecisionMapNode[];
  itemsToVerify: DecisionMapNode[];
  advisorReview: DecisionMapNode[];
  nextActions: DecisionMapNode[];
}

export function filterVisibleNodes(
  nodes: DecisionMapNode[],
  admin: boolean
): DecisionMapNode[] {
  return admin ? nodes : nodes.filter((node) => node.visibility === "public");
}

export function groupDecisionMapNodes(
  nodes: DecisionMapNode[],
  admin: boolean
): DecisionMapColumns {
  const visible = filterVisibleNodes(nodes, admin);
  const columns: DecisionMapColumns = {
    knownFacts: [],
    itemsToVerify: [],
    advisorReview: [],
    nextActions: [],
  };
  const assigned = new Set<string>();

  const assign = (node: DecisionMapNode, column: keyof DecisionMapColumns) => {
    if (assigned.has(node.id)) return;
    columns[column].push(node);
    assigned.add(node.id);
  };

  for (const node of visible) {
    if (node.type === "objective" || node.type === "known_fact") {
      assign(node, "knownFacts");
    }
  }

  for (const node of visible) {
    if (assigned.has(node.id)) continue;
    if (
      node.type === "missing_info" ||
      node.type === "document" ||
      (node.type === "decision_blocker" && (admin || node.visibility === "public"))
    ) {
      assign(node, "itemsToVerify");
    }
  }

  for (const node of visible) {
    if (assigned.has(node.id)) continue;
    if (node.type === "advisor" || node.type === "planning_topic") {
      assign(node, "advisorReview");
    }
  }

  for (const node of visible) {
    if (assigned.has(node.id)) continue;
    if (node.type === "next_action") {
      assign(node, "nextActions");
    }
  }

  for (const node of visible) {
    if (assigned.has(node.id)) continue;
    if (node.status === "known" || node.type === "objective") {
      assign(node, "knownFacts");
    } else if (node.status === "missing" || node.status === "not_started") {
      assign(node, "itemsToVerify");
    } else if (node.type === "decision_blocker") {
      assign(node, "itemsToVerify");
    } else {
      assign(node, "advisorReview");
    }
  }

  return columns;
}

export const NODE_STATUS_LABELS: Record<string, string> = {
  known: "Known",
  missing: "To verify",
  needs_review: "Needs review",
  complete: "Complete",
  not_started: "Not started",
};
