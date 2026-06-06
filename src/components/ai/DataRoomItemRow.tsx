import { Badge } from "@/components/ui/badge";
import type { DataRoomItem } from "@/lib/schemas/decision-layer";

const STATUS_LABELS: Record<DataRoomItem["status"], string> = {
  not_requested: "Not requested",
  requested: "Requested",
  received: "Received",
  reviewed: "Reviewed",
  not_needed: "Not needed",
};

interface DataRoomItemRowProps {
  item: DataRoomItem;
  admin?: boolean;
  onStatusChange?: (status: DataRoomItem["status"]) => void;
}

export function DataRoomItemRow({
  item,
  admin,
  onStatusChange,
}: DataRoomItemRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy">{item.item_name}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
        )}
        {admin && item.advisor_owner && (
          <p className="mt-1 text-xs text-gray-400">
            Advisor owner: {item.advisor_owner}
          </p>
        )}
        {admin && item.ai_reason && (
          <p className="mt-1 text-xs italic text-gray-400">{item.ai_reason}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{item.priority}</Badge>
        {admin && onStatusChange ? (
          <select
            value={item.status}
            onChange={(e) =>
              onStatusChange(e.target.value as DataRoomItem["status"])
            }
            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <Badge>{STATUS_LABELS[item.status]}</Badge>
        )}
      </div>
    </div>
  );
}
