import { DataRoomItemRow } from "@/components/ai/DataRoomItemRow";
import type { DataRoomItem } from "@/lib/schemas/decision-layer";

interface DataRoomCategorySectionProps {
  leadId: string;
  category: string;
  items: DataRoomItem[];
  admin?: boolean;
  onStatusChange?: (itemId: string, status: DataRoomItem["status"]) => void;
  onRefresh?: () => void;
}

export function DataRoomCategorySection({
  leadId,
  category,
  items,
  admin,
  onStatusChange,
  onRefresh,
}: DataRoomCategorySectionProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 font-serif text-sm text-navy">{category}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <DataRoomItemRow
            key={item.id}
            leadId={leadId}
            item={item}
            admin={admin}
            onStatusChange={
              onStatusChange
                ? (status) => onStatusChange(item.id, status)
                : undefined
            }
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
