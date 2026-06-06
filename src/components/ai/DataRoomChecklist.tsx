"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataRoomCategorySection } from "@/components/ai/DataRoomCategorySection";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { calculateDataRoomCompletion } from "@/lib/data-room/calculateDataRoomCompletion";
import { trackDataRoomViewed, trackDataRoomItemUpdated } from "@/lib/analytics";
import type { DataRoomItem, PublicDataRoomItem } from "@/lib/schemas/decision-layer";

interface DataRoomChecklistProps {
  leadId: string;
  publicItems?: PublicDataRoomItem[] | DataRoomItem[];
  admin?: boolean;
}

export function DataRoomChecklist({
  leadId,
  publicItems,
  admin = false,
}: DataRoomChecklistProps) {
  const [items, setItems] = useState<(DataRoomItem | PublicDataRoomItem)[]>(
    publicItems ?? []
  );
  const [loading, setLoading] = useState(admin);

  const load = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/leads/${leadId}/data-room`);
      const json = (await res.json()) as { items: DataRoomItem[] };
      setItems(json.items);
      trackDataRoomViewed({ lead_id: leadId });
    } finally {
      setLoading(false);
    }
  }, [admin, leadId]);

  useEffect(() => {
    if (!admin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- admin data-room fetch
    void load();
  }, [admin, load]);

  const displayItems = admin
    ? items
    : items.filter((i) => i.visibility === "public");

  const metrics = useMemo(
    () => calculateDataRoomCompletion(displayItems as DataRoomItem[]),
    [displayItems]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, (DataRoomItem | PublicDataRoomItem)[]>();
    displayItems.forEach((item) => {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [displayItems]);

  const updateStatus = async (
    itemId: string,
    status: DataRoomItem["status"]
  ) => {
    await adminFetch(`/api/leads/${leadId}/data-room/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    trackDataRoomItemUpdated({ lead_id: leadId, status });
    void load();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-xl border border-gray-100 p-6">
        <div className="h-4 w-1/3 rounded bg-gray-100" />
        <div className="h-3 w-full rounded bg-beige/40" />
        <div className="h-12 rounded bg-gray-50" />
        <div className="h-12 rounded bg-gray-50" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <ReportCard
        title={admin ? "Private Client Data Room" : "Information to Prepare"}
      >
        <p className="text-sm text-gray-500">
          {admin
            ? "No data room items yet. They will appear after AI generation."
            : "Your advisory team will share preparation items as planning progresses."}
        </p>
      </ReportCard>
    );
  }

  return (
    <div className="space-y-4">
      <ReportCard
        title={admin ? "Private Client Data Room" : "Information to Prepare"}
      >
        {admin && (
          <div className="mb-4 space-y-3 rounded-xl border border-champagne/20 bg-beige/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-navy">Completion progress</p>
              <p className="text-xs text-gray-500">
                {metrics.completionPercent}% collected · {metrics.reviewPercent}%
                reviewed
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-champagne transition-all"
                style={{ width: `${metrics.completionPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
              <MetricPill label="Requested" value={metrics.requestedCount} />
              <MetricPill label="Received" value={metrics.receivedCount} />
              <MetricPill label="Reviewed" value={metrics.reviewedCount} />
              <MetricPill label="High-priority open" value={metrics.highPriorityOpenCount} />
            </div>
          </div>
        )}

        {!admin && (
          <p className="mb-4 text-sm text-gray-600">
            These items may help prepare for advisor review. They are planning
            topics — not legal, tax, lending, or investment advice.
          </p>
        )}

        <div className="space-y-6">
          {[...grouped.entries()].map(([category, catItems]) => (
            <DataRoomCategorySection
              key={category}
              leadId={leadId}
              category={category}
              items={catItems as DataRoomItem[]}
              admin={admin}
              onStatusChange={admin ? updateStatus : undefined}
              onRefresh={admin ? load : undefined}
            />
          ))}
        </div>

        {admin && (
          <p className="mt-4 text-xs text-gray-400">
            Uploads are admin-only and stored in a private bucket. Document
            summaries are for advisor review — not legal, tax, lending, or
            investment advice.
          </p>
        )}
      </ReportCard>

      {admin && (
        <Button size="sm" variant="secondary" onClick={() => void load()}>
          Refresh checklist
        </Button>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}
