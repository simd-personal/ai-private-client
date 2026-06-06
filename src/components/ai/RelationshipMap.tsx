import { ReportCard } from "@/components/report/report-card";
import type { RelationshipIntelligenceMap } from "@/lib/schemas/ai-strategy-room";

interface RelationshipMapProps {
  data: RelationshipIntelligenceMap;
}

export function RelationshipMapPanel({ data }: RelationshipMapProps) {
  const nodePositions = layoutNodes(data.nodes);

  return (
    <ReportCard title="Relationship Map">
      <p className="mb-6 text-sm leading-relaxed text-gray-600">{data.summary}</p>

      <div className="relative overflow-x-auto rounded-xl border border-gray-100 bg-gradient-to-br from-beige/40 to-white p-6">
        <svg
          viewBox="0 0 600 320"
          className="mx-auto w-full max-w-2xl"
          aria-label="Advisor relationship map"
        >
          {data.edges.map((edge) => {
            const from = nodePositions.get(edge.from);
            const to = nodePositions.get(edge.to);
            if (!from || !to) return null;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#c9b896"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity={0.6}
                />
              </g>
            );
          })}

          {data.nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;
            const isClient = node.type === "client";
            return (
              <g key={node.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isClient ? 36 : 28}
                  fill={isClient ? "#1a2332" : "#faf9f7"}
                  stroke="#c9b896"
                  strokeWidth="2"
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="fill-navy text-[10px] font-medium"
                  style={{ fontSize: isClient ? 11 : 9 }}
                >
                  {truncateLabel(node.label, isClient ? 14 : 10)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.edges.slice(0, 4).map((edge) => (
          <div
            key={`${edge.from}-${edge.to}-legend`}
            className="rounded-lg bg-white p-3 text-xs text-gray-600"
          >
            <span className="font-medium text-navy">
              {edge.relationship}
            </span>
            <span className="text-gray-400"> — </span>
            {edge.coordinationNeed}
          </div>
        ))}
      </div>
    </ReportCard>
  );
}

function truncateLabel(label: string, max: number): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function layoutNodes(
  nodes: RelationshipIntelligenceMap["nodes"]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const client = nodes.find((n) => n.type === "client");
  if (client) positions.set(client.id, { x: 300, y: 160 });

  const others = nodes.filter((n) => n.type !== "client");
  const angleStep = (2 * Math.PI) / Math.max(others.length, 1);
  others.forEach((node, i) => {
    const angle = angleStep * i - Math.PI / 2;
    positions.set(node.id, {
      x: 300 + Math.cos(angle) * 180,
      y: 160 + Math.sin(angle) * 120,
    });
  });

  return positions;
}

export function RelationshipMapSkeleton() {
  return (
    <ReportCard title="Relationship Map">
      <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
    </ReportCard>
  );
}
