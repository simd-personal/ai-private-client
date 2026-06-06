"use client";

import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminTenantSettingsForm } from "@/components/admin/admin-tenant-settings-form";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export function AdminSettingsPageView() {
  const tenant = getDefaultTenant();
  return (
    <AdminAuthGate
      title="Tenant Settings"
      description={`Internal settings for ${tenant.brandName}`}
    >
      <AdminPageShell
        title="Tenant Settings"
        subtitle="Manage branding, contact details, booking links, disclosures, and SEO defaults for this tenant."
      >
        <AdminTenantSettingsForm />
      </AdminPageShell>
    </AdminAuthGate>
  );
}

export default function AdminSettingsPage() {
  return <AdminSettingsPageView />;
}
