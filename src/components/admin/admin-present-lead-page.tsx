"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PresentationModeViewer } from "@/components/ai/PresentationMode";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { PresentationMode } from "@/lib/schemas/ai-strategy-room";
import { trackPresentationOpened } from "@/lib/analytics";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

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

  useEffect(() => {
    trackPresentationOpened({ lead_id: leadId });
    adminFetch(`/api/leads/${leadId}/presentation`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Presentation not found");
        const data = (await res.json()) as { presentation: PresentationMode };
        setPresentation(data.presentation);
      })
      .catch(() => setError("Unable to load presentation"));
  }, [leadId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy text-white">
        <p>{error}</p>
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

  const backPath = tenantSlug
    ? `/a/${tenantSlug}/admin`
    : "/admin";

  return (
    <PresentationModeViewer
      data={presentation}
      showSpeakerNotes
      onClose={() => router.push(backPath)}
    />
  );
}

export function PresentLeadPage(props: PresentLeadPageProps) {
  const tenant = getDefaultTenant();
  return (
    <AdminAuthGate
      title="Present Brief"
      description={`Presentation mode for ${tenant.brandName}`}
    >
      <PresentLeadContent {...props} />
    </AdminAuthGate>
  );
}
