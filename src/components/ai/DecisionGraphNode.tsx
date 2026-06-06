import {
  NODE_STATUS_LABELS,
  type DecisionMapNode,
} from "@/lib/decision/decision-map-utils";
import type { DecisionGraph } from "@/lib/schemas/decision-layer";

const TYPE_LABELS: Record<string, string> = {
  objective: "Objective",
  known_fact: "Known fact",
  missing_info: "Missing info",
  advisor: "Advisor",
  document: "Document",
  planning_topic: "Planning topic",
  decision_blocker: "Decision blocker",
  next_action: "Next action",
};

interface DecisionGraphNodeListProps {
  nodes: DecisionMapNode[];
  grouped?: boolean;
  showEdges?: DecisionGraph["edges"];
}

export function DecisionGraphNodeList({
  nodes,
  grouped = false,
  showEdges,
}: DecisionGraphNodeListProps) {
  if (grouped) {
    const groups = new Map<string, DecisionMapNode[]>();
    for (const node of nodes) {
      const key = TYPE_LABELS[node.type] ?? node.type;
      const list = groups.get(key) ?? [];
      list.push(node);
      groups.set(key, list);
    }

    return (
      <div className="space-y-4">
        {[...groups.entries()].map(([type, groupNodes]) => (
          <div key={type}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              {type}
            </p>
            <div className="space-y-2">
              {groupNodes.map((node) => (
                <DecisionGraphNodeRow key={node.id} node={node} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {nodes.map((node) => (
          <DecisionGraphNodeRow key={node.id} node={node} />
        ))}
      </div>
      {showEdges && showEdges.length > 0 ? (
        <div className="border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Edges
          </p>
          <ul className="space-y-1 text-sm text-gray-600">
            {showEdges.map((edge) => (
              <li key={`${edge.from}-${edge.to}`}>
                {edge.from} → {edge.to} ({edge.dependencyType.replace(/_/g, " ")})
                {edge.label ? ` · ${edge.label}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DecisionGraphNodeRow({ node }: { node: DecisionMapNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-beige/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy">
          {TYPE_LABELS[node.type] ?? node.type}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
          {NODE_STATUS_LABELS[node.status] ?? node.status}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
          {node.visibility}
        </span>
      </div>
      <p className="mt-2 font-medium leading-snug text-navy">{node.label}</p>
      {node.description ? (
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{node.description}</p>
      ) : null}
    </div>
  );
}

export const TYPE_COLORS: Record<string, string> = {
  objective: "#1a2332",
  known_fact: "#4a5568",
  missing_info: "#8a7347",
  advisor: "#2d3748",
  document: "#718096",
  planning_topic: "#5c5346",
  decision_blocker: "#9b4d4d",
  next_action: "#c9b896",
};

export { NODE_STATUS_LABELS as STATUS_LABELS };
