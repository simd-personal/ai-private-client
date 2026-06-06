"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdvisorActionItemList } from "@/components/ai/AdvisorActionItemList";
import {
  AdvisorActionLaneCard,
  AdvisorActionLanePublicSection,
} from "@/components/ai/AdvisorActionLane";
import { AdvisorDecisionBlockers } from "@/components/ai/AdvisorDecisionBlockers";
import { AdvisorNextBestPath } from "@/components/ai/AdvisorNextBestPath";
import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  trackAdvisorActionBoardRegenerated,
  trackAdvisorActionBoardViewed,
} from "@/lib/analytics";
import type {
  AdvisorActionBoard,
  AdvisorActionItem,
  PublicAdvisorActionBoard,
} from "@/lib/schemas/advisor-action-board";

interface AdvisorActionBoardAdminProps {
  leadId: string;
  initialBoard: AdvisorActionBoard | null;
  stale?: boolean;
  onRegenerated?: () => void;
}

export function AdvisorActionBoardAdmin({
  leadId,
  initialBoard,
  stale = false,
  onRegenerated,
}: AdvisorActionBoardAdminProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [localBoard, setLocalBoard] = useState<AdvisorActionBoard | null>(null);
  const [items, setItems] = useState<AdvisorActionItem[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  const board = localBoard ?? initialBoard;
  const boardStale = localBoard ? false : stale;

  const fetchItems = useCallback(async () => {
    const res = await adminFetch(`/api/leads/${leadId}/advisor-action-items`);
    const json = (await res.json()) as { items: AdvisorActionItem[] };
    setItems(json.items ?? []);
  }, [leadId]);

  const fetchBoard = useCallback(async () => {
    const res = await adminFetch(`/api/leads/${leadId}/advisor-action-board`);
    const json = (await res.json()) as {
      board: AdvisorActionBoard | null;
      stale: boolean;
    };
    setLocalBoard(json.board);
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load action items for admin board tab
    void fetchItems();
  }, [fetchItems, initialBoard?.generatedAt]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackAdvisorActionBoardViewed({ lead_id: leadId, admin: 1 });
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [leadId]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await adminFetch(
        `/api/leads/${leadId}/advisor-action-board/regenerate`,
        { method: "POST" }
      );
      const json = (await res.json()) as { board: AdvisorActionBoard };
      setLocalBoard(json.board);
      trackAdvisorActionBoardRegenerated({ lead_id: leadId });
      onRegenerated?.();
      await fetchItems();
    } finally {
      setRegenerating(false);
    }
  };

  if (!board) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <p className="mb-3 text-sm text-gray-600">
          Advisor Action Board not yet generated.
        </p>
        <Button size="sm" disabled={regenerating} onClick={() => void regenerate()}>
          {regenerating ? "Generating…" : "Generate Action Board"}
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-serif text-lg text-navy">{board.boardTitle}</h4>
          <p className="mt-1 text-sm text-gray-600">{board.caseSummary}</p>
          <p className="mt-2 text-sm text-gray-700">
            <span className="font-medium text-navy">Primary coordination need: </span>
            {board.primaryCoordinationNeed}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {board.overallStage.replace(/_/g, " ")}
            </Badge>
            {boardStale ? (
              <Badge variant="hot">Stale — regenerate recommended</Badge>
            ) : null}
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={regenerating}
          onClick={() => void regenerate()}
        >
          {regenerating ? "Regenerating…" : "Regenerate Board"}
        </Button>
      </div>

      <AdvisorNextBestPath steps={board.nextBestPath} admin />

      <ReportCard title="Advisor Lanes">
        <div className="space-y-4">
          {board.lanes.map((lane) => (
            <AdvisorActionLaneCard key={lane.id} lane={lane} admin />
          ))}
        </div>
      </ReportCard>

      <AdvisorDecisionBlockers blockers={board.blockers} />

      <ReportCard title="Action Items">
        <AdvisorActionItemList
          leadId={leadId}
          items={items}
          onChange={() => {
            void fetchItems();
            void fetchBoard();
          }}
        />
      </ReportCard>

      <div className="rounded-xl bg-beige/30 p-4 text-sm text-gray-600">
        <p className="font-medium text-navy">Admin summary</p>
        <p className="mt-1">{board.adminSummary}</p>
        {board.staleReason ? (
          <p className="mt-2 text-xs text-gray-400">Stale reason: {board.staleReason}</p>
        ) : null}
      </div>
    </div>
  );
}

interface AdvisorActionBoardPublicProps {
  board: PublicAdvisorActionBoard;
  leadId?: string;
}

export function AdvisorActionBoardPublic({
  board,
  leadId,
}: AdvisorActionBoardPublicProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackAdvisorActionBoardViewed({
            lead_id: leadId,
            admin: 0,
          });
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [leadId]);

  if (board.lanes.length === 0 && board.nextBestPath.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="space-y-4">
      <ReportCard title="Advisor Review Plan">
        <p className="leading-relaxed text-gray-700">{board.clientSafeSummary}</p>
      </ReportCard>
      <AdvisorNextBestPath steps={board.nextBestPath} />
      <AdvisorActionLanePublicSection lanes={board.lanes} />
    </div>
  );
}
