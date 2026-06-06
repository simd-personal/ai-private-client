"use client";

import { useRouter } from "next/navigation";
import { PlatformAuthGate } from "@/components/platform/platform-auth-gate";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import {
  PlatformTenantForm,
  type PlatformTenantSubmitPayload,
} from "@/components/platform/platform-tenant-form";
import { platformAdminFetch } from "@/lib/platform-admin/fetch";

function NewPlatformTenantView() {
  const router = useRouter();

  const handleCreateTenant = async (payload: PlatformTenantSubmitPayload) => {
    try {
      const res = await platformAdminFetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { tenant?: { slug: string }; error?: string; details?: { fieldErrors?: Record<string, string[]> } }
        | undefined;

      if (!res.ok || !data?.tenant?.slug) {
        const fieldErrors = data?.details?.fieldErrors;
        if (fieldErrors) {
          const messages = Object.entries(fieldErrors)
            .flatMap(([field, errors]) =>
              errors?.length ? [`${field.replace(/_/g, " ")}: ${errors.join(", ")}`] : []
            )
            .join(" ");
          return { ok: false, error: messages || data?.error || "Failed to create tenant" };
        }
        return { ok: false, error: data?.error ?? "Failed to create tenant" };
      }

      router.push(`/platform/tenants/${data.tenant.slug}`);
      return { ok: true };
    } catch {
      return { ok: false, error: "Failed to connect" };
    }
  };

  return (
    <PlatformPageShell
      title="Create Tenant"
      subtitle="Provision a new tenant without writing SQL."
    >
      <PlatformTenantForm
        mode="create"
        onSubmit={handleCreateTenant}
        submitLabel="Create tenant"
      />
    </PlatformPageShell>
  );
}

export default function PlatformNewTenantPage() {
  return (
    <PlatformAuthGate
      title="Platform Admin"
      description="Restricted access for platform-level tenant management."
    >
      <NewPlatformTenantView />
    </PlatformAuthGate>
  );
}
