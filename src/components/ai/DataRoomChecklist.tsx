"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataRoomCategorySection } from "@/components/ai/DataRoomCategorySection";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { trackDataRoomViewed, trackDataRoomItemUpdated } from "@/lib/analytics";
import type { DataRoomItem } from "@/lib/schemas/decision-layer";

interface DataRoomChecklistProps {
  leadId: string;
  publicItems?: DataRoomItem[];
  admin?: boolean;
}

export function DataRoomChecklist({
  leadId,
  publicItems,
  admin = false,
}: DataRoomChecklistProps) {
  const [items, setItems] = useState<DataRoomItem[]>(publicItems ?? []);
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

  const grouped = useMemo(() => {
    const map = new Map<string, DataRoomItem[]>();
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

  const completed = displayItems.filter(
    (i) => i.status === "reviewed" || i.status === "not_needed"
  ).length;
  const pct = Math.round((completed / displayItems.length) * 100);

  return (
    <div className="space-y-4">
      <ReportCard
        title={admin ? "Private Client Data Room" : "Information to Prepare"}
      >
        {admin && (
          <p className="mb-4 text-xs text-gray-500">
            Completion: {completed}/{displayItems.length} ({pct}%)
          </p>
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
              category={category}
              items={catItems}
              admin={admin}
              onStatusChange={admin ? updateStatus : undefined}
            />
          ))}
        </div>
        {admin && (
          <p className="mt-4 text-xs text-gray-400">
            Upload support coming next. For now, track requested / received /
            reviewed status.
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
