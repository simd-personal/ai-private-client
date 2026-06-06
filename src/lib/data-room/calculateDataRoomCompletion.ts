import type { DataRoomItem } from "@/lib/schemas/decision-layer";

export interface DataRoomCompletionMetrics {
  totalItems: number;
  requestedCount: number;
  receivedCount: number;
  reviewedCount: number;
  notNeededCount: number;
  highPriorityOpenCount: number;
  completionPercent: number;
  reviewPercent: number;
}

export function calculateDataRoomCompletion(
  items: DataRoomItem[]
): DataRoomCompletionMetrics {
  const totalItems = items.length;
  const requestedCount = items.filter((i) => i.status === "requested").length;
  const receivedCount = items.filter((i) => i.status === "received").length;
  const reviewedCount = items.filter((i) => i.status === "reviewed").length;
  const notNeededCount = items.filter((i) => i.status === "not_needed").length;

  const highPriorityOpenCount = items.filter(
    (i) =>
      i.priority === "high" &&
      (i.status === "not_requested" || i.status === "requested")
  ).length;

  const progressCount = receivedCount + reviewedCount + notNeededCount;
  const reviewCompleteCount = reviewedCount + notNeededCount;

  const completionPercent =
    totalItems > 0 ? Math.round((progressCount / totalItems) * 100) : 0;
  const reviewPercent =
    totalItems > 0 ? Math.round((reviewCompleteCount / totalItems) * 100) : 0;

  return {
    totalItems,
    requestedCount,
    receivedCount,
    reviewedCount,
    notNeededCount,
    highPriorityOpenCount,
    completionPercent,
    reviewPercent,
  };
}
