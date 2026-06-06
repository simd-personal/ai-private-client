"use client";

import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import {
  AdvisorLaneStatusBadge,
  AdvisorLaneUrgencyBadge,
} from "@/components/ai/AdvisorLaneStatusBadge";
import { getAdvisorRoleLabel } from "@/lib/schemas/advisor-action-board";
import type {
  AdvisorActionLane,
  PublicAdvisorActionLane,
} from "@/lib/schemas/advisor-action-board";

type Lane = AdvisorActionLane | PublicAdvisorActionLane;

interface AdvisorActionLaneProps {
  lane: Lane;
  admin?: boolean;
}

export function AdvisorActionLaneCard({ lane, admin = false }: AdvisorActionLaneProps) {
  const isAdminLane = admin && "adminOnlyNote" in lane;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{getAdvisorRoleLabel(lane.advisorRole)}</Badge>
        <AdvisorLaneStatusBadge status={lane.status} />
        <AdvisorLaneUrgencyBadge urgency={lane.urgency} />
        {lane.canShareWithClient ? (
          <Badge variant="champagne">Client-safe</Badge>
        ) : null}
      </div>

      <p className="font-medium text-navy">{lane.displayName}</p>
      <p className="mt-1 text-sm text-gray-600">{lane.laneSummary}</p>

      <div className="mt-3 space-y-2 text-sm">
        <p>
          <span className="font-medium text-navy">Why this advisor matters: </span>
          {lane.whyThisAdvisorMatters}
        </p>
        <p>
          <span className="font-medium text-navy">Next action: </span>
          {lane.nextAction}
        </p>
        <p>
          <span className="font-medium text-navy">Target timing: </span>
          {lane.targetTiming}
        </p>
      </div>

      {lane.missingInformation.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Missing information
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
            {lane.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {lane.relatedDataRoomItems.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Related data room items
          </p>
          <ul className="mt-1 space-y-1 text-sm text-gray-600">
            {lane.relatedDataRoomItems.map((item) => (
              <li key={`${item.category}-${item.itemName}`}>
                {item.itemName}{" "}
                <span className="text-xs text-gray-400">
                  ({item.status.replace(/_/g, " ")})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lane.questionsToAsk.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Questions to ask
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
            {lane.questionsToAsk.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isAdminLane && lane.adminOnlyNote ? (
        <p className="mt-3 rounded-lg bg-champagne/10 p-2 text-xs text-gray-500">
          {lane.adminOnlyNote}
        </p>
      ) : null}

      {!admin ? (
        <p className="mt-3 text-sm text-gray-600">{lane.clientSafeSummary}</p>
      ) : null}
    </div>
  );
}

export function AdvisorActionLanePublicSection({
  lanes,
}: {
  lanes: PublicAdvisorActionLane[];
}) {
  if (lanes.length === 0) return null;

  return (
    <ReportCard title="Advisor Coordination Areas">
      <div className="space-y-4">
        {lanes.map((lane) => (
          <AdvisorActionLaneCard key={lane.id} lane={lane} />
        ))}
      </div>
    </ReportCard>
  );
}
