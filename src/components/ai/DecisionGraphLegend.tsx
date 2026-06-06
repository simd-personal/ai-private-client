import { TYPE_COLORS } from "@/components/ai/DecisionGraphNode";

const LEGEND = [
  { type: "objective", label: "Objective" },
  { type: "known_fact", label: "Known fact" },
  { type: "missing_info", label: "Missing info" },
  { type: "advisor", label: "Advisor" },
  { type: "planning_topic", label: "Planning topic" },
  { type: "next_action", label: "Next action" },
];

export function DecisionGraphLegend({ admin }: { admin?: boolean }) {
  const items = admin
    ? [...LEGEND, { type: "decision_blocker", label: "Blocker" }, { type: "document", label: "Document" }]
    : LEGEND;

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[item.type] ?? "#718096" }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}
