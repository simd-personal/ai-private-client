import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeadScoreBadgeProps {
  score: number;
  temperature: "cold" | "warm" | "hot";
  className?: string;
}

export function LeadScoreBadge({
  score,
  temperature,
  className,
}: LeadScoreBadgeProps) {
  const variant =
    temperature === "hot"
      ? "hot"
      : temperature === "warm"
        ? "warm"
        : "cold";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={variant}>{temperature} lead</Badge>
      <span className="text-sm text-gray-500">Score: {score}/100</span>
    </div>
  );
}
