"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformAuthGate } from "@/components/platform/platform-auth-gate";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import { Button } from "@/components/ui/button";
import { platformAdminFetch } from "@/lib/platform-admin/fetch";
import type { MercerDemoResetResult } from "@/lib/demo/reset-mercer-demo";

type DemoStatus = MercerDemoResetResult | null;

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

function MercerDemoContent() {
  const [status, setStatus] = useState<DemoStatus>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminFetch("/api/platform/demo/mercer-newport/reset");
      const data = (await res.json()) as { status?: DemoStatus; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load demo status");
        return;
      }
      setStatus(data.status ?? null);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminFetch("/api/platform/demo/mercer-newport/reset", {
        method: "POST",
      });
      const data = (await res.json()) as MercerDemoResetResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Demo reset failed");
        return;
      }
      setStatus(data);
    } catch {
      setError("Failed to reset demo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform demo status fetch
    void fetchStatus();
  }, [fetchStatus]);

  return (
    <PlatformPageShell
      title="Mercer Newport Demo"
      subtitle="Aspen to Newport Beach Private Property Transition — example wealth advisory workflow (Demo only; not affiliated with Mercer Advisors)."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/platform/demo/checklist">
            <Button variant="secondary">Pitch checklist</Button>
          </Link>
          <Button variant="secondary" onClick={() => void fetchStatus()} disabled={loading}>
            Refresh status
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-xl border border-champagne/30 bg-beige/20 p-4 text-sm text-gray-600">
        Demo tenant only. This workspace illustrates an example private client property
        planning workflow. It does not imply affiliation, endorsement, or a production
        partnership with Mercer Advisors.
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-100 bg-white p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => void resetDemo()} disabled={loading}>
            {loading ? "Working…" : "Reset Demo"}
          </Button>
          {status ? (
            <>
              <a href={status.adminLeadUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open Admin Lead</Button>
              </a>
              <a href={status.publicResultUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open Public Result</Button>
              </a>
              <a href={status.presentationUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open Presentation</Button>
              </a>
            </>
          ) : null}
        </div>

        {status ? (
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Copy Public Link" value={status.publicResultUrl} />
            <CopyButton label="Copy Admin Link" value={status.adminLeadUrl} />
            <CopyButton label="Copy Presentation Link" value={status.presentationUrl} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No demo lead yet. Click Reset Demo to create a fresh pitch-ready lead.
          </p>
        )}
      </section>

      {status ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatusTile label="Lead ID" value={status.leadId} />
          <StatusTile
            label="Last generated"
            value={
              status.aiGeneratedAt
                ? new Date(status.aiGeneratedAt).toLocaleString()
                : "—"
            }
          />
          <StatusTile
            label="Readiness score"
            value={status.readinessScore != null ? String(status.readinessScore) : "—"}
          />
          <StatusTile label="Guardrails" value={status.guardrailsStatus ?? "—"} />
          <StatusTile
            label="Data room items"
            value={String(status.dataRoomItemCount)}
          />
          <StatusTile label="Decision stage" value={status.decisionStage ?? "—"} />
          <StatusTile
            label="Action board lanes"
            value={String(status.actionBoardLaneCount ?? 0)}
          />
          <StatusTile
            label="Action board blockers"
            value={String(status.actionBoardBlockerCount ?? 0)}
          />
          <StatusTile
            label="Next best path steps"
            value={String(status.actionBoardNextBestPathCount ?? 0)}
          />
          <StatusTile
            label="Action items"
            value={String(status.actionBoardActionItemCount ?? 0)}
          />
          <StatusTile
            label="Board stale"
            value={status.actionBoardStale ? "yes" : "no"}
          />
          <StatusTile label="AI source" value={status.aiGenerationSource ?? "—"} />
          <StatusTile label="AI model" value={status.aiGenerationModel ?? "—"} />
          <StatusTile label="Tenant slug" value={status.tenantSlug} />
        </section>
      ) : null}
    </PlatformPageShell>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs tracking-wide text-gray-400 uppercase">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-navy">{value}</p>
    </div>
  );
}

export default function PlatformMercerDemoPage() {
  return (
    <PlatformAuthGate
      title="Mercer Newport Demo"
      description="Platform-only demo reset and pitch links."
    >
      <MercerDemoContent />
    </PlatformAuthGate>
  );
}
