"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  getAdvisorRoleLabel,
  type AdvisorActionItem,
} from "@/lib/schemas/advisor-action-board";
import {
  trackAdvisorActionItemCompleted,
  trackAdvisorActionItemCreated,
  trackAdvisorActionItemUpdated,
} from "@/lib/analytics";

interface AdvisorActionItemListProps {
  leadId: string;
  items: AdvisorActionItem[];
  onChange: () => void;
}

export function AdvisorActionItemList({
  leadId,
  items,
  onChange,
}: AdvisorActionItemListProps) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [laneRole, setLaneRole] = useState("real_estate_agent");
  const [clientVisible, setClientVisible] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const createItem = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await adminFetch(`/api/leads/${leadId}/advisor-action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lane_role: laneRole,
          title: title.trim(),
          client_visible: clientVisible,
        }),
      });
      trackAdvisorActionItemCreated({ lead_id: leadId });
      setTitle("");
      onChange();
    } finally {
      setCreating(false);
    }
  };

  const updateItem = async (
    itemId: string,
    patch: Record<string, unknown>
  ) => {
    setBusyId(itemId);
    try {
      await adminFetch(`/api/leads/${leadId}/advisor-action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (patch.status === "complete") {
        trackAdvisorActionItemCompleted({ lead_id: leadId });
      } else {
        trackAdvisorActionItemUpdated({ lead_id: leadId });
      }
      onChange();
    } finally {
      setBusyId(null);
    }
  };

  const deleteItem = async (itemId: string) => {
    setBusyId(itemId);
    try {
      await adminFetch(`/api/leads/${leadId}/advisor-action-items/${itemId}`, {
        method: "DELETE",
      });
      onChange();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-gray-200 p-4">
        <p className="mb-2 text-sm font-medium text-navy">Create action item</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Action title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={laneRole}
            onChange={(e) => setLaneRole(e.target.value)}
          >
            {[
              "real_estate_agent",
              "wealth_advisor",
              "cpa",
              "attorney",
              "lender_private_banker",
              "family_office_director",
              "insurance_risk_advisor",
            ].map((role) => (
              <option key={role} value={role}>
                {getAdvisorRoleLabel(role)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
            />
            Client visible
          </label>
          <Button size="sm" disabled={creating} onClick={() => void createItem()}>
            Add
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No action items yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-beige/20 p-3"
            >
              <div>
                <p className="text-sm font-medium text-navy">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {getAdvisorRoleLabel(item.lane_role)} · {item.status.replace(/_/g, " ")}
                  {item.client_visible ? " · client visible" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id || item.status === "complete"}
                  onClick={() =>
                    void updateItem(item.id, { status: "complete" })
                  }
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() =>
                    void updateItem(item.id, {
                      client_visible: !item.client_visible,
                    })
                  }
                >
                  {item.client_visible ? "Hide from client" : "Show to client"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void deleteItem(item.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
