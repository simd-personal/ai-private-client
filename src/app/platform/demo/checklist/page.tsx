"use client";

import Link from "next/link";
import { PlatformAuthGate } from "@/components/platform/platform-auth-gate";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import { Button } from "@/components/ui/button";

const CHECKLIST = [
  {
    step: 1,
    title: "Open landing page",
    detail: "Show the demo tenant entry point and positioning.",
    href: "/a/mercer-newport-demo",
  },
  {
    step: 2,
    title: "Open demo public brief",
    detail: "Use Reset Demo on /platform/demo first, then open the public result link.",
    href: "/platform/demo",
  },
  {
    step: 3,
    title: "Show Strategy Room",
    detail: "Executive summary, known facts, and items to verify.",
  },
  {
    step: 4,
    title: "Show Scenario Comparison",
    detail: "Planning scenarios for discussion — not advice.",
  },
  {
    step: 5,
    title: "Show Decision Graph",
    detail: "Client-safe Decision Map with next best path.",
  },
  {
    step: 6,
    title: "Show Advisor Action Board",
    detail: "Role-specific advisor lanes, next best path, and coordination blockers.",
  },
  {
    step: 7,
    title: "Show Advisor Coordination Map",
    detail: "CPA, attorney, wealth advisor, lender, and licensed agent review topics.",
  },
  {
    step: 8,
    title: "Open admin",
    detail: "Platform → Reset Demo → Open Admin Lead.",
    href: "/platform/demo",
  },
  {
    step: 9,
    title: "Show Data Room",
    detail: "Private Client Data Room checklist and completion status.",
  },
  {
    step: 10,
    title: "Show Guardrails",
    detail: "Compliance-safe AI review panel and public disclosure preview.",
  },
  {
    step: 11,
    title: "Show Meeting Copilot",
    detail: "Paste meeting notes and generate client-safe follow-up.",
  },
  {
    step: 12,
    title: "Open Presentation Mode",
    detail: "Slide-style walkthrough for live pitch.",
    href: "/platform/demo",
  },
  {
    step: 13,
    title: "End with pilot proposal",
    detail:
      "Position as a private client decision operating layer — demo workflow only, not Mercer affiliation.",
  },
];

export default function PlatformDemoChecklistPage() {
  return (
    <PlatformAuthGate
      title="Demo Pitch Checklist"
      description="Internal walkthrough for wealth management firm demos."
    >
      <PlatformPageShell
        title="Demo Pitch Checklist"
        subtitle="Mercer Newport Demo — internal only"
        actions={
          <Link href="/platform/demo">
            <Button variant="secondary">Back to demo panel</Button>
          </Link>
        }
      >
        <div className="mb-6 rounded-xl border border-champagne/30 bg-beige/20 p-4 text-sm text-gray-600">
          Use this sequence for a 15–20 minute live pitch. Reset the demo from{" "}
          <Link href="/platform/demo" className="text-navy underline">
            /platform/demo
          </Link>{" "}
          before each session.
        </div>

        <ol className="space-y-4">
          {CHECKLIST.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wide text-champagne uppercase">
                    Step {item.step}
                  </p>
                  <p className="mt-1 font-serif text-lg text-navy">{item.title}</p>
                  <p className="mt-2 text-sm text-gray-600">{item.detail}</p>
                </div>
                {item.href ? (
                  <Link href={item.href}>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </PlatformPageShell>
    </PlatformAuthGate>
  );
}
