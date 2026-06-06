"use client";

import type { LeadSessionJourney } from "@/lib/analytics/server";

function JourneyFlag({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={
        done
          ? "rounded-full bg-champagne/20 px-2.5 py-1 text-xs font-medium text-navy"
          : "rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-400"
      }
    >
      {label}
    </span>
  );
}

export function AdminLeadSessionJourney({
  journey,
}: {
  journey: LeadSessionJourney | null | undefined;
}) {
  if (!journey) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
        No linked session activity for this lead.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 text-sm">
      <p className="mb-3 font-medium text-navy">Session journey</p>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="text-gray-400">Landing page: </span>
          <span className="font-mono text-xs text-gray-700">
            {journey.landingPage ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-400">First event: </span>
          {journey.firstEventAt
            ? new Date(journey.firstEventAt).toLocaleString()
            : "—"}
        </div>
        <div>
          <span className="text-gray-400">Pages viewed: </span>
          {journey.pagesViewed.length > 0
            ? journey.pagesViewed.join(", ")
            : "—"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <JourneyFlag label="CTA clicked" done={journey.ctaClicked} />
        <JourneyFlag label="Quiz started" done={journey.quizStarted} />
        <JourneyFlag label="Quiz submitted" done={journey.quizSubmitted} />
        <JourneyFlag label="Result viewed" done={journey.resultViewed} />
        <JourneyFlag label="Booking clicked" done={journey.bookingClicked} />
      </div>
    </div>
  );
}
