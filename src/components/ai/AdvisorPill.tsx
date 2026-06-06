import { Badge } from "@/components/ui/badge";
import {
  ADVISOR_TYPE_LABELS,
  type AdvisorType,
} from "@/lib/schemas/ai-strategy-room";

interface AdvisorPillProps {
  advisorType: AdvisorType | string;
  urgency?: "low" | "medium" | "high";
}

export function AdvisorPill({ advisorType, urgency }: AdvisorPillProps) {
  const label =
    ADVISOR_TYPE_LABELS[advisorType as AdvisorType] ?? String(advisorType);

  return (
    <div className="flex items-center gap-2">
      <Badge variant="champagne" className="font-normal">
        {label}
      </Badge>
      {urgency && (
        <Badge
          variant={
            urgency === "high" ? "hot" : urgency === "medium" ? "warm" : "cold"
          }
          className="text-xs capitalize"
        >
          {urgency}
        </Badge>
      )}
    </div>
  );
}
