"use client";

import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminActivityDashboard } from "@/components/admin/admin-activity-dashboard";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export function AdminActivityPageView() {
  const tenant = getDefaultTenant();
  return (
    <AdminAuthGate
      title="Website Activity"
      description={`Internal analytics for ${tenant.brandName}`}
    >
      <AdminActivityDashboard />
    </AdminAuthGate>
  );
}

export default function AdminActivityPage() {
  return <AdminActivityPageView />;
}
