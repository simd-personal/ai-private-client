"use client";

import { Badge } from "@/components/ui/badge";
import {
  getLaneStatusLabel,
  getLaneUrgencyLabel,
  type LaneStatus,
  type LaneUrgency,
} from "@/lib/schemas/advisor-action-board";

const STATUS_VARIANT: Record<
  LaneStatus,
  "default" | "outline" | "hot" | "champagne"
> = {
  not_started: "outline",
  needs_review: "champagne",
  ready_for_meeting: "default",
  waiting_on_client: "champagne",
  waiting_on_document: "hot",
  in_progress: "default",
  complete: "default",
};

const URGENCY_CLASS: Record<LaneUrgency, string> = {
  low: "border-gray-200 text-gray-500",
  medium: "border-champagne/50 text-navy",
  high: "border-red-200 text-red-700",
};

export function AdvisorLaneStatusBadge({ status }: { status: LaneStatus | string }) {
  const label = getLaneStatusLabel(status);
  const variant = STATUS_VARIANT[status as LaneStatus] ?? "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

export function AdvisorLaneUrgencyBadge({
  urgency,
}: {
  urgency: LaneUrgency | string;
}) {
  const label = getLaneUrgencyLabel(urgency);
  const className = URGENCY_CLASS[urgency as LaneUrgency] ?? URGENCY_CLASS.medium;
  return (
    <Badge variant="outline" className={className}>
      {label} urgency
    </Badge>
  );
}
