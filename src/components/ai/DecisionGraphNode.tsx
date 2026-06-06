import type { DecisionGraph } from "@/lib/schemas/decision-layer";

const TYPE_COLORS: Record<string, string> = {
  objective: "#1a2332",
  known_fact: "#4a5568",
  missing_info: "#b8860b",
  advisor: "#2d3748",
  document: "#718096",
  planning_topic: "#805ad5",
  decision_blocker: "#c53030",
  next_action: "#c9b896",
};

const STATUS_LABELS: Record<string, string> = {
  known: "Known",
  missing: "Missing",
  needs_review: "Needs review",
  complete: "Complete",
  not_started: "Not started",
};

interface DecisionGraphNodeProps {
  node: DecisionGraph["nodes"][number];
  x: number;
  y: number;
  compact?: boolean;
}

export function DecisionGraphNode({
  node,
  x,
  y,
  compact,
}: DecisionGraphNodeProps) {
  const r = node.type === "objective" ? 34 : compact ? 22 : 26;
  const fill = TYPE_COLORS[node.type] ?? "#718096";

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={fill}
        stroke="#c9b896"
        strokeWidth="1.5"
        opacity={node.type === "objective" ? 1 : 0.92}
      />
      <text
        x={x}
        y={y + (compact ? 3 : 4)}
        textAnchor="middle"
        fill={node.type === "objective" ? "#faf9f7" : "#1a2332"}
        style={{ fontSize: compact ? 8 : 9 }}
      >
        {truncate(node.label, compact ? 12 : 16)}
      </text>
      {!compact && (
        <text
          x={x}
          y={y + r + 14}
          textAnchor="middle"
          fill="#718096"
          style={{ fontSize: 8 }}
        >
          {STATUS_LABELS[node.status] ?? node.status}
        </text>
      )}
    </g>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export { TYPE_COLORS, STATUS_LABELS };
