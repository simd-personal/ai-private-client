const LEGEND = [
  { type: "objective", label: "Objective", color: "bg-navy" },
  { type: "known_fact", label: "Known fact", color: "bg-gray-600" },
  { type: "missing_info", label: "Item to verify", color: "bg-champagne" },
  { type: "advisor", label: "Advisor review", color: "bg-navy/70" },
  { type: "planning_topic", label: "Planning topic", color: "bg-gray-500" },
  { type: "next_action", label: "Next action", color: "bg-beige" },
];

export function DecisionGraphLegend({ admin }: { admin?: boolean }) {
  const items = admin
    ? [
        ...LEGEND,
        { type: "decision_blocker", label: "Blocker", color: "bg-red-200" },
        { type: "document", label: "Document", color: "bg-gray-400" },
      ]
    : LEGEND;

  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
