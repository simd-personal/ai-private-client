"use client";

import { BookingCta } from "@/components/booking/booking-cta";
import { ReportCard } from "@/components/report/report-card";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { getAdvisoryTeamLabel } from "@/lib/tenants/tenant-copy";

const COPY_TEMPLATES = {
  buyer:
    "Your brief is ready for a private review. {team} can help compare your preferred areas, budget, property type, timing, and the main tradeoffs before you make a move.",
  seller:
    "Your seller planning brief is ready for advisor review. {team} can help evaluate presentation, timing, and whether a discreet market test makes sense before broader exposure.",
  equity:
    "Your equity scenario is ready for advisor review. {team} can help pressure test the net proceeds range and map sequencing options for selling and buying.",
  wealth_forecast:
    "Your wealth forecast is ready for advisor review. {team} can help pressure test purchase assumptions, leverage, monthly carry, and which CPA or lender topics to confirm before you act.",
} as const;

interface PrivateReviewCtaProps {
  leadType: keyof typeof COPY_TEMPLATES;
}

export function PrivateReviewCta({ leadType }: PrivateReviewCtaProps) {
  const tenant = useCurrentTenant();
  const team = getAdvisoryTeamLabel(tenant);
  const copy = COPY_TEMPLATES[leadType].replace("{team}", team);

  return (
    <ReportCard title="Private Review Recommended">
      <p className="mb-6 leading-relaxed text-gray-600">{copy}</p>
      <BookingCta
        location={`result_page_${leadType}_review`}
        fullWidth
      />
    </ReportCard>
  );
}
