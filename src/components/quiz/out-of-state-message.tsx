"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

export function OutOfStateMessage() {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const regionLabel =
    tenant.supportedStates.length === 1 &&
    tenant.supportedStates[0]?.toUpperCase() === "CA"
      ? "California"
      : tenant.supportedStates.join(", ");
  return (
    <Card className="border-champagne/30 bg-champagne/5">
      <CardContent className="p-8 text-center">
        <Globe className="mx-auto mb-4 h-10 w-10 text-navy" />
        <h3 className="font-serif text-xl text-navy mb-3">
          Outside {regionLabel}?
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {tenant.brandName} is currently licensed in {regionLabel} only. We would
          be happy to connect you with a trusted referral partner in your state.
          Please reach out directly and we will make a warm introduction.
        </p>
        <Link href={tenantPathFromPathname(pathname, "/")}>
          <Button variant="secondary">Return Home</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
