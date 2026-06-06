import { DataRoomItemRow } from "@/components/ai/DataRoomItemRow";
import type { DataRoomItem } from "@/lib/schemas/decision-layer";

interface DataRoomCategorySectionProps {
  category: string;
  items: DataRoomItem[];
  admin?: boolean;
  onStatusChange?: (itemId: string, status: DataRoomItem["status"]) => void;
}

export function DataRoomCategorySection({
  category,
  items,
  admin,
  onStatusChange,
}: DataRoomCategorySectionProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 font-serif text-sm text-navy">{category}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <DataRoomItemRow
            key={item.id}
            item={item}
            admin={admin}
            onStatusChange={
              onStatusChange
                ? (status) => onStatusChange(item.id, status)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
