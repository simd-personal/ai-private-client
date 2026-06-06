"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PresentationModeViewer } from "@/components/ai/PresentationMode";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { PresentationMode } from "@/lib/schemas/ai-strategy-room";
import { trackPresentationOpened } from "@/lib/analytics";
import { getDefaultTenant, getTenantBySlug } from "@/lib/tenants/tenant-config";

interface PresentLeadPageProps {
  leadId: string;
  tenantSlug?: string;
}

function PresentLeadContent({ leadId, tenantSlug }: PresentLeadPageProps) {
  const router = useRouter();
  const [presentation, setPresentation] = useState<PresentationMode | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const backPath = tenantSlug ? `/a/${tenantSlug}/admin` : "/admin";

  useEffect(() => {
    if (!leadId) return;
    trackPresentationOpened({ lead_id: leadId });
    adminFetch(`/api/leads/${leadId}/presentation`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Presentation unavailable (${res.status})`);
        }
        const data = (await res.json()) as { presentation?: PresentationMode };
        if (!data.presentation?.slides?.length) {
          throw new Error("Presentation slides not generated yet");
        }
        setPresentation(data.presentation);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Unable to load presentation"
        );
      });
  }, [leadId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy px-6 text-center text-white">
        <p className="max-w-md text-sm">{error}</p>
        <p className="max-w-md text-xs text-white/60">
          Sign in with your admin password on this tenant, then run Reset Demo if
          the lead was created before AI generation finished.
        </p>
        <button
          type="button"
          onClick={() => router.push(backPath)}
          className="rounded-lg border border-champagne/40 px-4 py-2 text-sm text-champagne"
        >
          Back to admin
        </button>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-champagne border-t-transparent" />
      </div>
    );
  }

  return (
    <PresentationModeViewer
      data={presentation}
      showSpeakerNotes
      onClose={() => router.push(backPath)}
    />
  );
}

export function PresentLeadPage(props: PresentLeadPageProps) {
  const tenant = props.tenantSlug
    ? getTenantBySlug(props.tenantSlug)
    : getDefaultTenant();
  return (
    <AdminAuthGate
      title="Present Brief"
      description={`Presentation mode for ${tenant.brandName}`}
    >
      <PresentLeadContent {...props} />
    </AdminAuthGate>
  );
}
